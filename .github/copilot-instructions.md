# Copilot instructions for the Magus monorepo

## Big picture

- Yarn Berry monorepo orchestrated by Lage. Workspaces live in `apps/*` and `packages/*` (see root `package.json`).
- Example app: terminal UI chat client at `apps/magus/src/index.tsx` (Ink + React). It renders a chat UI and talks to a local HTTP server using `@ai-sdk/react`.
- The app spins up an embedded HTTP server via `@magus/server` (`packages/server`), built on Hono + `ai`. Provided route: POST `/api/chat` (apps can add more).
- Providers live in `packages/providers` and implement `MagusProvider` (LM Studio and Ollama today). They use `@ai-sdk/openai-compatible` and typed Zod parsing for model discovery.
- Ink helpers live in `packages/ink-ext` (e.g., `ScrollArea`, `useRawStdin`).

## How things talk

1. App creates a provider (e.g., `createLmStudioProvider()`), builds a server via `createServer({ providers, model })`, then calls `listen()` to start a server on a random port.
2. UI uses `DefaultChatTransport` with `api: ${baseUrl}api/chat` to send `useChat` messages.
3. `packages/server/src/server.ts` handles `/api/chat`: converts UI messages, calls `streamText`, and returns `toUIMessageStreamResponse()`.

## Dev workflow (Yarn + Lage)

- Install: `yarn install`
- Run app: `yarn dev` (root) or `cd apps/magus && yarn dev` (uses ts-node). The app prints `server.url` and connects to `/api/chat`.
- Tests: `yarn test` (Lage runs package tests). Example: provider schemas in `packages/providers/src/*.test.ts`.
- Lint/format: `yarn lint`, `yarn format` (ESLint flat config + Prettier).
- Build: `yarn build` (all). App bundling: `yarn workspace @magus/magus build` (Rollup to `dist/index.js`).

## Conventions and patterns

- ESM across packages (`type: module`). Packages build to `dist` with `tsc`; `exports` map to built files.
- Server composition keeps model explicit: `createServer({ providers, model })`.
- `MagusProvider` contract (see `packages/providers/src/types.ts`):
  - `model(id: string): LanguageModel`
  - `models(): Promise<ModelInfo[]>` where `ModelInfo = { id, reasoning, context_length, tool_use }`
- Provider discovery examples:
  - LM Studio: GET `${origin}/api/v0/models` parsed by `LmStudioModelInfoSchema`; filter out `type === 'embeddings'`.
  - Ollama: GET `${origin}/api/tags`, then POST `${origin}/api/show` per model; read `${arch}.context_length` with fallback.
- Ink input: components may use `useInput`/`useFocus`. If you need raw key mode (e.g., some environments), call `useRawStdin()` once at app root.

## Integration details

- Defaults: LM Studio `http://localhost:1234`, Ollama `http://localhost:11434`.
- Example app model: `openai/gpt-oss-20b` via LM Studio (see `apps/magus/src/index.tsx`).
- Server listens on a random free port; app passes `server.url` to the client.
- Streaming uses `ai`'s `streamText` to produce UI-compatible responses.

## Typical edits

- Switch provider in `apps/magus/src/index.tsx`: swap `createLmStudioProvider()` for `createOllamaProvider()` and set `model: provider.model("<model-id>")`.
- Enumerate models: `await provider.models()` to list IDs with `context_length`/capabilities.
- Extend providers: add a file in `packages/providers/src`, export from `src/index.ts`, implement `MagusProvider` + discovery.
- Add routes: extend `packages/server/src/server.ts` with new `app.get/post(...)` handlers.

## Gotchas

- Ensure LM Studio or Ollama is running locally at the expected origin before chatting; otherwise `/api/chat` fails on model invocation.
- Single React/Ink instance: rely on workspace deps; app bundling (Rollup) avoids duplicate React. Keep Node built-ins external (see `rollup.config.js`).
- vitest is ESM-configured per package
- The app exits on `/exit`; remember to call `stop()` on the returned server handle.
