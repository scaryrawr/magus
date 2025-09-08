# @magus/magus

Main Magus CLI application built with **Ink** and **React**.

## Install & Run

```bash
# Install all workspace dependencies
bun install

# Start the CLI (development mode)
bun run apps/magus
```

The package already defines a `bin` entry pointing to `src/main.tsx`, so after a global install you can run `magus` directly.

## Scripts

- `build` – Compile to a single binary located at `dist/magus`.
- `bundle` – Run the custom bundling script (`bundle.ts`).
- `typecheck` – Run TypeScript type checking.
- `test` – Execute the package tests.

## Development

The UI uses Ink components from `@magus/react` and tool integrations from `@magus/tools`. Modify sources under `src/` and run `bun run test` to ensure stability.
