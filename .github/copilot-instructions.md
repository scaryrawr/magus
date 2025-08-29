# Magus Monorepo

## Architecture Overview

Magus is a Bun monorepo for composable agentic tools with these core components:

- **Terminal UI Chat Client** (`apps/magus`): Ink + React app with embedded HTTP server
- **Modular Server** (`packages/server`): Hono + `ai` package for streaming LLM responses
- **Provider System** (`packages/providers`): Unified interface for LM Studio, Ollama, OpenRouter
- **Tool System** (`packages/tools`, `packages/react-tools`): File operations, shell, editor tools
- **UI Components** (`packages/react`): Reusable Ink components like `ScrollArea`

Key data flow: UI → embedded server (`/v0/chat`) → provider → streaming response

## Essential Workflows

```bash
# Development
bun install                     # Install all workspace dependencies
bun apps/magus/src/main.ts     # Run app from repo root
cd apps/magus && bun src/main.ts # Alternative from app directory

# Testing & Quality
bun test                       # All tests (individual: bun test file.test.ts)
bun test:coverage             # Coverage with lcov output
bun run --filter @magus/providers test  # Package-specific tests
bun typecheck                 # TypeScript checking
bun lint                      # ESLint (fix with bun lint:fix)
bun format                    # Prettier formatting

# Building
bun run build                 # All packages
bun run bundle               # Cross-platform executables (see bundle.ts)
```

## Code Patterns & Conventions

**Provider Interface** (`packages/providers/src/types.ts`):

```typescript
interface MagusProvider {
  name: string;
  model(id: string): LanguageModel;
  models(): Promise<ModelInfo[]>; // { id, reasoning, context_length, tool_use }
}
```

**Server Composition**:

```typescript
// RouterFactory pattern - preferred for new endpoints
const myRouter: RouterFactory = (state) => new Hono().get("/my-route", handler);
createServer({ providers, model, routers: [myRouter] });
```

**Observable State**: Server uses `ObservableServerState` with events (`change:model`, `change:tools`) for reactive updates.

**Tool Sets**: Provider-specific tool configuration in `getProviderToolSet()` - LM Studio gets file tools, others get editor tools.

## Critical Dependencies & Integration

- **Workspace resolution**: Uses `workspace:*` for internal packages, catalog references for shared deps
- **ESLint config**: Flat config with React hooks, unused imports, 120-char Prettier
- **Provider discovery**: Filters out embeddings models; LM Studio uses `/api/v0/models`, Ollama uses `/api/tags` + `/api/show`
- **UI Router**: React Router with memory history, routes defined in `apps/magus/src/routes.tsx`
- **Server lifecycle**: Random port (`port: 0`), auto-selects first available model on startup

## Testing Approach

- **Provider mocking**: Implement `MagusProvider` interface for tests
- **Zod validation**: All API responses validated with schemas (see `LmStudioModelInfoSchema`)
- **Ink limitations**: Component tests constrained by `measureElement()` in test environment
- **Coverage**: Use `bun test:coverage` → generates `coverage/lcov.info`

## Common Gotchas

- **Runtime deps**: Requires LM Studio (`:1234`) or Ollama (`:11434`) running locally
- **Model selection**: App auto-selects first model from `/v0/models` response
- **ScrollArea behavior**: Auto-pins to bottom unless user manually scrolls up
- **Bundle targets**: Cross-platform builds via `bundle.ts` for multiple architectures
- **System prompts**: Loaded from `.github/copilot-instructions.md` if available (see `app.tsx`)

## Extending the System

**New provider**: Implement `MagusProvider` in `packages/providers/src/`, add Zod schemas for API validation
**New tools**: Add to `packages/tools/src/tools/`, update tool set mapping in `app.tsx`
**New routes**: Create `RouterFactory` function, add to `createServer({ routers })` array
**UI components**: Add to `packages/react/src/components/`, follow Ink patterns with `useInput` for navigation

## Making Changes

When making changes to the Magus monorepo, you must follow these steps to ensure consistency and maintainability:

1. Add unit tests.
2. Ensure all tests pass by running `bun test`.
3. Run `bun lint` and `bun format` to maintain code quality.
4. Fix all linter errors.
