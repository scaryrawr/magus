# Copilot instructions for the Magus monorepo

## Big picture

- Bun monorepo with workspaces in `apps/*` and `packages/*` (see root `package.json`).
- Example app: terminal UI chat client at `apps/magus/src/index.tsx` (Ink + React). It renders a chat UI and talks to a local HTTP server using `@ai-sdk/react`.
- The app spins up an embedded HTTP server via `@magus/server` (`packages/server`), built on Hono + `ai`. Default route: POST `/v0/chat` (apps can add more endpoints).
- Providers live in `packages/providers` and implement `MagusProvider` (LM Studio and Ollama today) using `@ai-sdk/openai-compatible` and Zod for typed discovery.
- Ink helpers live in `packages/react` (e.g., `ScrollArea`).

## How things talk

1. App creates a provider (e.g., `createLmStudioProvider()`), builds a server via `createServer({ providers, model })`, then calls `listen()` to start on a random port.
2. UI uses `@ai-sdk/react` with `api: ${baseUrl}/v0/chat` to send `useChat` messages via `DefaultChatTransport`.
3. `packages/server/src/chat.ts` handles `/v0/chat`: converts UI messages, calls `streamText`, and returns `toUIMessageStreamResponse()`; `packages/server/src/server.ts` wires Hono + routers.
4. Server context passed via React Context (`ServerProvider`) to access `server.url` in UI components.
5. `packages/server/src/models.ts` exposes a models router mounted under `/v0/models` to enumerate available models across configured providers. Also supports runtime model switching via POST `/v0/model`.

## Dev workflow (Bun workspaces)

- Install: `bun install`
- Run app: from repo root run `bun apps/magus/src/index.tsx`, or from the app dir `cd apps/magus && bun src/index.tsx`. The UI connects to `/v0/chat` via `server.url`.
- Tests: `bun run test` (workspace-aware); per package: `bun run --filter @magus/<package> test`. Individual file: `bun test <file>.test.ts`. Coverage: `bun test:coverage`.
- Lint/format: `bun run lint`, `bun run format` (ESLint flat config + Prettier with 120 char width).
- Build: `bun run build` (all packages), or `bun run --filter @magus/magus build` for just the app (emits `dist/magus` executable via Bun `--compile`).
- Typecheck: `bun run typecheck` (all packages) or per-package via filter.

## Conventions and patterns

- **MagusProvider** (see `packages/providers/src/types.ts`): `model(id): LanguageModel`; `models(): Promise<ModelInfo[]>` with `{ id, reasoning, context_length, tool_use }`.
- **Server composition**: `createServer({ providers, model, routers? })` pattern. New `RouterFactory[]` pattern mounts under `/v0`; legacy `EndpointRegistrar[]` still supported for backward compatibility.
- **Provider discovery**: LM Studio GET `${origin}/api/v0/models` filtered by type !== "embeddings"; Ollama GET `/api/tags` then POST `/api/show` per model, reads `${arch}.context_length` (defaults to 1024).
- **Router factories**: See `packages/server/src/chat.ts` - return Hono instance from function taking `ServerState`. Preferred over EndpointRegistrar.
- **UI patterns**: Ink app with React Router, uses `useInput` for navigation (ESC to home), command patterns (`/exit`, `/home`). ScrollArea component has autoscroll behavior (pinned to bottom unless user scrolled up).
- **Testing**: Mock providers using `MagusProvider` interface; comprehensive endpoint testing; Ink component tests limited by measureElement() in test environment.
- **TypeScript**: ESM everywhere (`"type": "module"`), strict typing, workspace deps via `workspace:*`.

## Integration details and gotchas

- **Provider defaults**: LM Studio `http://localhost:1234`, Ollama `http://localhost:11434`.
- **Model selection**: Example uses `openai/gpt-oss-20b` via LM Studio (see `apps/magus/src/index.tsx`).
- **Server lifecycle**: Listens on random free port (`port: 0`); UI reads `server.url`. The app calls `server.stop()` automatically on exit.
- **Streaming**: Uses `ai` package's `streamText` → `toUIMessageStreamResponse()` for UI compatibility.
- **Runtime requirements**: Ensure LM Studio or Ollama running locally; `/v0/chat` fails without active model.
- **Bundling**: App build uses Bun's `--compile` to produce `dist/magus`.

## Typical edits

- **Switch providers**: In `apps/magus/src/index.tsx`, swap `createLmStudioProvider()` for `createOllamaProvider()` and update `model: provider.model("<model-id>")`.
- **Add routes**: Implement `RouterFactory` (pattern: `(state) => router`) and pass via `createServer({ routers: [yourRouter] })`.
- **Extend providers**: Add file in `packages/providers/src`, export from `index.ts`, implement `MagusProvider` with Zod schemas for API validation.
- **UI navigation**: Modify `apps/magus/src/App.tsx` routes; use `useInput` hooks for custom key bindings in components.
