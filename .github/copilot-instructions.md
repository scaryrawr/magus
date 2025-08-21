# Copilot instructions for the Magus monorepo

## Big picture

- Bun monorepo with workspaces in `apps/*` and `packages/*` (see root `package.json`).
- Example app: terminal UI chat client at `apps/magus/src/index.tsx` (Ink + React). It renders a chat UI and talks to a local HTTP server using `@ai-sdk/react`.
- The app spins up an embedded HTTP server via `@magus/server` (`packages/server`), built on Hono + `ai`. Default route: POST `/v0/chat` (apps can add more endpoints).
- Providers live in `packages/providers` and implement `MagusProvider` (LM Studio and Ollama today) using `@ai-sdk/openai-compatible` and Zod for typed discovery.
- Ink helpers live in `packages/ink-ext` (e.g., `ScrollArea`).

## How things talk

1. App creates a provider (e.g., `createLmStudioProvider()`), builds a server via `createServer({ providers, model })`, then calls `listen()` to start on a random port.
2. UI uses `@ai-sdk/react` with `api: ${baseUrl}v0/chat` to send `useChat` messages.
3. `packages/server/src/chat.ts` handles `/v0/chat`: converts UI messages, calls `streamText`, and returns `toUIMessageStreamResponse()`; `packages/server/src/server.ts` wires Hono + routers.

## Dev workflow (Bun workspaces)

- Install: `bun install`
- Run app: `bun dev` (root) or `cd apps/magus && bun dev` (tsx). The app prints `server.url` and connects to `/v0/chat`.
- Tests: `bun test` (workspace-aware vitest); coverage via individual package scripts.
- Lint/format: `bun lint`, `bun format` (ESLint flat config + Prettier).
- Build all: `bun build`. App bundle: `bun --filter @magus/magus build` (Rollup to `dist/index.js`).

## Conventions and patterns

- MagusProvider (see `packages/providers/src/types.ts`): `model(id): LanguageModel`; `models(): Promise<{ id, reasoning, context_length, tool_use }[]>`.
- Server composition keeps model explicit: `createServer({ providers, model, routers? })`; new pattern uses `RouterFactory[]` for mounting under `/v0`, with back-compat `EndpointRegistrar[]`.
- Provider discovery: LM Studio GET `${origin}/api/v0/models` parsed by `LmStudioModelInfoSchema` (filter out `embeddings`); Ollama GET `/api/tags` then POST `/api/show` per model, read `${arch}.context_length` (default 1024).
- Routers in `packages/server/src/`: `chatRouter`, `modelsRouter` follow new `RouterFactory` pattern; legacy endpoints still supported.
- ESM everywhere (`type: module`); TS builds to `dist` with exports mapping; workspace deps use `workspace:*` pattern.

## Integration details and gotchas

- Defaults: LM Studio `http://localhost:1234`, Ollama `http://localhost:11434`.
- Example app model: `openai/gpt-oss-20b` via LM Studio (see `apps/magus/src/index.tsx`).
- Server listens on a random free port; UI is passed `server.url` at render time.
- Streaming uses `ai`'s `streamText` to produce UI-compatible responses.
- Ensure LM Studio or Ollama is running locally; otherwise `/v0/chat` requests will fail on model invocation.
- Single React/Ink instance: rely on workspace deps; bundling (Rollup) avoids duplicate React. Keep Node built-ins external (see `apps/magus/rollup.config.js`).
- The app exits on `/exit`; remember to call `close()` on the returned server handle.

## Typical edits

- Switch provider in `apps/magus/src/index.tsx`: swap `createLmStudioProvider()` for `createOllamaProvider()` and set `model: provider.model("<model-id>")`.
- Enumerate models: `await provider.models()` to list IDs with `context_length`/capabilities; or expose `/v0/models` by registering `modelsRouter`.
- Extend providers: add a file in `packages/providers/src`, export from `src/index.ts`, implement `MagusProvider` + discovery using Zod-validated fetches.
- Add routes: implement a `RouterFactory` (see `packages/server/src/chat.ts`) and pass it via `createServer({ ..., routers: [yourRouter] })` rather than editing server internals.
