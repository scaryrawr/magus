# @magus/server

Hono-based HTTP server exposing Magus model + tooling APIs consumed by the CLI UI. Provides a clean separation between interactive Ink rendering and backend concerns (provider selection, model listing, prompt routing).

## Routes

- `GET /models` – List available models from configured providers.
- `POST /chat` – Stream chat / completion style responses.
- `POST /prompt` – Generic prompt interface (subject to evolution).

(See `src/routes/` for schemas and implementations.)

## Architecture

- Lightweight in-memory state via `ObservableServerState`.
- Providers injected from `@magus/providers` allowing flexible composition.
- Zod validation on all external request payloads.

### Conversation Summarization (v1)

The `/chat` route includes proactive summarization to prevent context window overflows while preserving salient technical and decision information.

Key behaviors:

- Token ratio trigger (default 0.8) with hysteresis reset (0.7) + cooldown (4 new msgs) to avoid duplicate triggers.
- Depth‑capped chain (max 3). Each summary replaces prior history with a synthetic system message + preserved recent tail (default 6 messages).
- Structured extraction (summary, keyPoints, context facets) stored as `SummaryRecord` objects (only message IDs retained, not full text).
- Emergency mode fires if ratio ≥ 1.0 ignoring cooldown.
- Fail‑open default (`abortOnFailure=false`): on failure keeps full messages intact.

Current in‑code defaults:

```jsonc
{
  "enabled": true,
  "triggerTokenRatio": 0.8,
  "resetTokenRatio": 0.7,
  "minMessages": 12,
  "preserveRecent": 6,
  "maxSummaryChainDepth": 3,
  "cooldownMessages": 4,
  "abortOnFailure": false,
}
```

Per‑chat metadata:

- `summaryHistory: SummaryRecord[]`
- `lastSummarization: { depth, messageCount, tokenRatio }`

Planned (not yet implemented): model preference ordering, periodic re‑summary cadence, integrity hashing, user `/resummarize` command, external config injection.

## Install

```bash
bun install
```

## Development

```bash
bun test --filter @magus/server
bun typecheck --filter @magus/server
```

Example startup (simplified):

```ts
import { createServer } from "@magus/server";

// createServer would wrap Hono app initialization (future extraction)
```

## Contributing

Keep the server stateless beyond ephemeral request handling; long‑lived caches belong in dedicated packages (e.g. config/cache packages).
