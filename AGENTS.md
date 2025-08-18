# AGENTS.md - Coding Guidelines for Magus Monorepo

## Build/Test Commands

- `yarn install` - Install dependencies
- `yarn test` - Run all tests (individual test: `yarn test <file>.test.ts`)
- `yarn lint` - Run ESLint
- `yarn format` - Format with Prettier
- `yarn dev` - Start the main app (magus)

## Code Style & Conventions

- Use TypeScript with strict typing. Export types/interfaces directly from TS files.
- Imports: Use `catalog:` for deps, `catalog:types` for type-only imports in package.json
- Formatting: Prettier with 120 char line width, ESLint flat config with React/hooks rules
- Naming: camelCase for variables/functions, PascalCase for components/types, kebab-case for files
- Use ESM (`"type": "module"`), Yarn Berry workspace resolution assumed
- Error handling: Use Zod schemas for validation, explicit error types where needed

## Architecture Patterns

- Monorepo: apps in `apps/*`, packages in `packages/*` managed by Lage build orchestration
- Providers implement `MagusProvider` interface with `model()` and `models()` methods
- Server composition via `createServer({ providers, model })` pattern
- Ink components use `useRawStdin()` for keyboard input handling
- Streaming via `ai` package with `streamText` and UI-compatible responses

## Key Rules from Copilot Instructions

- Always call `useRawStdin()` at top of Ink components needing keyboard input
- Use version catalogs in package.json dependencies
- Filter embeddings models from provider discovery
- Server listens on random port, apps read `server.url` for client connections
