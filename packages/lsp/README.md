# @magus/lsp

Lightweight utilities for working with Language Server Protocol (LSP) processes inside the Magus monorepo.

## Module Overview

The package is intentionally decomposed into small focused modules so maintenance does not concentrate excessive logic in a single file:

| Module                | Purpose                                                                                                             |
| --------------------- | ------------------------------------------------------------------------------------------------------------------- |
| `lspManager.ts`       | Orchestrates language server lifecycle, file event routing, diagnostics aggregation. Public API surface kept small. |
| `rpcClient.ts`        | Spawns a language server process and wires JSON-RPC streams + initialization handshake.                             |
| `selector.ts`         | Implements document selector + glob to RegExp translation and matching logic (separately unit tested).              |
| `diagnostics.ts`      | In-memory aggregation store for multi-client diagnostics with subscription support.                                 |
| `languages.ts`        | Heuristic language-id detection from file path (centralized to avoid drift).                                        |
| `projectLanguages.ts` | Detects likely project languages from marker files (used for heuristic prewarming).                                 |
| `defaults.ts`         | Curated default server definitions + helpers to build filtered configs.                                             |

This separation makes it simpler to:

- Add or adjust glob / pattern semantics without touching process code.
- Extend initialization logic (e.g. capabilities) in `rpcClient.ts` only.
- Add new language detection rules in one place.

## Quick Start

```ts
import { buildDefaultConfigs, LspManager } from "@magus/lsp";

const configs = buildDefaultConfigs({ includeLanguages: ["typescript", "markdown"] });
const mgr = new LspManager(configs, process.cwd());

// Optionally prewarm likely-needed servers based on marker files
await mgr.prewarmHeuristics();

// Start watching the project for file changes
mgr.startWatcher();

// Subscribe to diagnostics
const unsubscribe = mgr.onDiagnostics((fileDiags) => {
  console.log(fileDiags.uri, fileDiags.all.length, "diagnostics");
});
```

## Testing Strategy

- Core behaviors of the orchestrator remain covered by `lspManager.test.ts` using a stubbed client starter.
- New granular tests in `selector.test.ts` assert glob translation and selector matching edge cases.
- Diagnostics store logic validated separately for predictable aggregation semantics.

## Adding a New Language Server

1. Append a definition to `defaultServerDefinitions()` (or supply via `extra` in `buildDefaultConfigs`).
2. Include appropriate `selector` entries (language + pattern) referencing project structure.
3. If the language requires new extension mapping, update `languages.ts` and add a test case.
4. (Optional) Add marker file logic in `projectLanguages.ts` for heuristic prewarm.

## Graceful Shutdown

Call `await mgr.shutdownAll()` to request `shutdown` on each started server followed by `exit` notification and disposal of processes.

## Development

Install root dependencies then run tests (this package participates in the monorepo):

```bash
bun install
bun test --filter @magus/lsp
```

## License

MIT (see repository root).
