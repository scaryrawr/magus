# AGENTS.md - Coding Guidelines for Magus Monorepo

- `bun install` - Install dependencies
- `bun test` - Run all tests (individual test: `bun test <file>.test.ts`)
- `bun test:coverage` - Run all tests with coverage reporting
- `bun bundle` - Generate single file executables
- `bun typecheck` - Type check all packages
- `bun lint` - Run ESLint (fix with `bun lint:fix`)
- `bun format` - Format with Prettier
- Run app: `bun apps/magus/src/main.ts` (from repo root) or `cd apps/magus && bun src/index.tsx`

## Code Style & Conventions

- Use TypeScript with strict typing. Export types/interfaces directly from TS files.
- Imports: Direct dependencies (no catalog references), workspace packages via `workspace:*`
- Formatting: Prettier with 120 char line width, ESLint flat config with React/hooks rules
- Naming: camelCase for variables/functions, PascalCase for components/types, kebab-case for files
- Use ESM (`"type": "module"`), Bun workspace resolution assumed
- Error handling: Use Zod schemas for validation, explicit error types where needed

## Architecture Patterns

- Monorepo: apps in `apps/*`, packages in `packages/*` managed by Bun workspaces
- Providers implement `MagusProvider` interface with `model()` and `models()` methods
- Server composition via `createServer({ providers, model })` pattern
- Streaming via `ai` package with `streamText` and UI-compatible responses

## Key Rules from Copilot Instructions

- Use direct dependencies in package.json (no version catalogs)
- Filter embeddings models from provider discovery
- Server listens on random port, apps read `server.url` for client connections
