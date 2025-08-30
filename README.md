# Magus

[![CI](https://github.com/scaryrawr/magus/actions/workflows/ci.yml/badge.svg)](https://github.com/scaryrawr/magus/actions/workflows/ci.yml)

Magus is a personal CLI AI project heavily inspired by [sst/opencode](https://github.com/sst/opencode) and the CLI agent trend.

If you're looking for a complete tool, I heavily recommend opencode, this tool is more of a personal project for developing and figuring out LLM based tools.

## Project Structure

This monorepo contains multiple packages and applications:

### Apps

- `apps/magus` - The main Magus application

### Packages

- `packages/providers` - AI provider integrations
- `packages/react` - React components and hooks
- `packages/react-tools` - React components rendering AI tool interactions
- `packages/server` - Magus server for providing APIs to the app
- `packages/tools` - Core AI tools and utilities

## Getting Started

### Prerequisites

- Bun (v1.0 or higher)

### Installation

```bash
# Install dependencies
bun install

# Build all packages
bun run build
```

## Available Scripts

- `bun run build` - Build all packages
- `bun run test` - Run tests across all packages
- `bun run test:coverage` - Run tests with coverage
- `bun run typecheck` - Type check all packages
- `bun run lint` - Lint all files
- `bun run format` - Format code with Prettier
