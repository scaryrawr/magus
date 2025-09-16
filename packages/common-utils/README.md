# @magus/common-utils

Shared lightweight utilities used across Magus packages (path ignore filtering, generic helpers kept free of heavy deps).

## Features

- Central ignore filter utilities reused by tooling packages.
- Zero runtime dependencies besides extremely small libs.
- Pure TypeScript, strict mode.

## Install

Workspace install handled at repo root:

```bash
bun install
```

## Usage

```ts
import { buildIgnoreFilter } from "@magus/common-utils";

const shouldInclude = buildIgnoreFilter({ patterns: ["node_modules", ".git"] });
if (shouldInclude("src/index.ts")) {
  // process file
}
```

## Scripts

Run specifically for this package:

```bash
bun test --filter @magus/common-utils
bun typecheck --filter @magus/common-utils
```

## Contributing

Keep additions minimal; this package is intentionally small to avoid dependency cycles. Prefer placing domain logic in a more specific package.
