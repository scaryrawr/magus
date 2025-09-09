# AGENTS.md - Magus Development Guide

## Build/Test Commands

- `bun test` - run all tests
- `bun test --filter @magus/package-name` - run specific package tests
- `bun test path/to/specific.test.ts` - run single test file
- `bun test:coverage` - generate coverage report
- `bun typecheck` - TypeScript checking across all packages
- `bun lint && bun format` - lint and format code
- `bun run build` - build all packages

## Code Style

- Use Zod schemas for all external data validation (see `ModelInfoSchema` in providers/types.ts)
- Imports: Use `prettier-plugin-organize-imports` (auto-sorted)
- TypeScript: Strict mode enabled, use `type` imports for types
- Naming: camelCase for functions/variables, PascalCase for types/components
- Error handling: Use Result pattern or throw with descriptive messages
- Tool patterns: Factory functions returning object literal of `name: tool()` pairs
- React: Functional components with hooks, no prop-types (disabled in ESLint)

## Architecture Notes

This is a Bun monorepo with Terminal Ink UI (`apps/magus`) + Hono server (`packages/server`). The existing comprehensive guide is in `.github/copilot-instructions.md` - reference it for detailed patterns, provider interfaces, and architectural decisions. All new code should follow the established patterns documented there.
