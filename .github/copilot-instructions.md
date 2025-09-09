# Magus Monorepo – Agent Operations Guide

Concise facts an AI agent needs to work productively in this repo. Prefer specificity over generic advice.

## 1. Architecture & Flow

Terminal Ink app (`apps/magus`) launches an embedded Hono server (`packages/server`). Data path:
UI → `/v0/chat` (Hono) → selected provider (`packages/providers`) → streaming SSE → UI render.
`ObservableServerState` (events: `change:model`, `change:systemPrompt`, `change:instructions`) mediates provider/model/tool selection. System prompt (from `codex.txt`) + instructions (this file) are PATCHed at startup (`app.tsx`).

## 2. Key Packages

- `packages/providers`: LM Studio (`/api/v0/models`), Ollama (`/api/tags` + `/api/show`), OpenRouter (REST). Each returns `{ id, context_length, reasoning, tool_use }` with capability detection (`thinking`, `tools`, etc.). Filter out embeddings in LM Studio.
- `packages/server`: `createServer` wires routers under `/v0` (chat, models, prompt) and an SSE endpoint `/v0/sse` that pushes `model-change` events (JSON of current model select).
- `packages/tools`: Tool sets built with `ai.tool()`. Editor tool implements subcommands: view/create/insert/replace. Grep/search tool auto-selects fastest available binary (rg > grep > findstr) and falls back gracefully.
- `packages/react`: Reusable Ink components (e.g. scrolling, banners) with React Router memory routing (`routes.tsx`).
- `packages/lsp`: LSP manager feeding diagnostics via an editor plugin that wraps diagnostics in `<diagnostic_errors>` tags for model consumption.

## 3. Runtime & Environment Assumptions

- Bun runtime only; port is ephemeral (`port: 0`). Always detect actual server URL via returned `server.url`.
- Optional binaries accelerate tools: `rg`, `fd`, `delta`, `bat`. Absence is fine (fallback JS path in tools/diffs).
- Providers default origins: LM Studio `:1234`, Ollama `:11434`; OpenRouter only enabled if `OPENROUTER_API_KEY` is set.

## 4. Development Workflows

```bash
bun install                    # deps
bun apps/magus/src/main.ts     # run CLI (from repo root)
bun test                       # all tests
bun test:coverage              # coverage → coverage/lcov.info
bun typecheck                  # TS project-wide
bun lint && bun format         # quality gates
bun run build                  # build all packages
bun run bundle                 # cross-platform executables (see apps/magus/bundle.ts)
```

Package-scoped tests: `bun run --filter @magus/providers test` etc.

## 5. Core Patterns

- Provider interface (`packages/providers/src/types.ts`): `model(id)` returns an `ai` LanguageModel; `models()` returns pre-filtered capabilities. Cache remote lists where possible (see OpenRouter lazy cache with retry reset on rejection).
- Tools pattern: Factory returning object literal of tool name → `tool({...})`. Keep schemas in same file; output always Zod-validated.
- Editor tool examples (expected JSON command envelope) are embedded inside its description; reuse those when constructing tool calls.
- Streaming: SSE `/v0/sse` loop keeps connection alive with `stream.sleep(1000)`; remember to remove listeners on abort.
- Routing: Routes built dynamically; route metadata (descriptions) in `routes.tsx` for help/summary UIs.

## 6. Adding Functionality

- New provider: Implement factory returning `{ providerName: { model, models } }`, add capability detection, ensure Zod schema for remote shape, exclude non-chat models (e.g. embeddings). Export by spreading into providers object in `app.tsx`.
- New tool: Create file in `packages/tools/src/tools/`, export factory, add to `app.tsx` tools object. Provide concrete input/output examples in description; keep operations idempotent; rely on existing ignore filters (`@magus/common-utils`).
- New route: Add router factory to `packages/server/src/routes/` and compose via `app.route("/v0", myRouter(state))` inside `createServer` or extend pattern similarly.
- Extend editor output: Supply additional plugin functions in `EditorOutputPlugin` (see diagnostics injection pattern in `app.tsx`). Wrap structured sections in XML-ish tags for model clarity.

## 7. Testing & Validation Nuances

- Use provider schemas (e.g. `LmStudioModelInfoSchema`, `OllamaTagsSchema`) to guard fixtures. Mock `fetch` responses shaped exactly like provider Zod expects.
- Coverage artifacts consumed from `coverage/lcov.info` (maintain path stability if generating tooling around it).
- Ink component tests: Avoid relying on actual terminal measuring; prefer shallow logic tests or schema tests for outputs.

## 8. Common Pitfalls (Avoid)

- Assuming stable port number (always capture dynamic server URL).
- Sending tool commands without required `command` discriminator to editor tool.
- Forgetting to PATCH instructions/systemPrompt early → model context misses guidance.
- Treating grep tool as always `rg`; description dynamically reflects chosen backend.

## 9. Safe Modification Checklist

1. Add/adjust code.
2. Add or update focused unit tests (provider schema, tool behavior, route handling).
3. Run: test → typecheck → lint → format.
4. Keep public signatures stable unless feature requires change—then update dependent imports across packages.

## 10. Quick File Landmarks

- System prompt: `apps/magus/src/codex.txt`
- Instructions loader: `apps/magus/src/app.tsx`
- SSE model events: `packages/server/src/server.ts`
- State events & prompt assembly: `packages/server/src/ObservableServerState.ts`
- Editor tool + examples: `packages/tools/src/tools/editor/editor.ts`
- Grep/search implementation: `packages/tools/src/tools/grep.ts`
- Provider capability logic: each file in `packages/providers/src/` (`lmstudio.ts`, `ollama.ts`, `openrouter.ts`)

---

If any section is unclear or you need deeper detail on a specific pattern, request an expansion citing the heading.
