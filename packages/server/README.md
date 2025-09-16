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
