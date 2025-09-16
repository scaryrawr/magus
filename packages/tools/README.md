# @magus/tools

Core tool implementations used by the Magus CLI and UI layers. Each tool encapsulates an operation (grep, glob, file edit, shell, web fetch, todo, LSP) exposed via small factory-returned APIs.

## Design

- Each tool lives under `src/tools/<name>` with focused logic + tests.
- Stateless where possible; stateful concerns (e.g. todo list) expose a minimal in-memory store.
- Zod used for validating external inputs where applicable.

## Implemented Tools

- Editor: create / view / insert / replace / split
- Grep & Glob: filesystem search abstractions with ignore filtering
- Shell: persistent process execution with streaming output
- LSP: basic language server interaction facade
- Webfetch: HTML fetch + markdown conversion
- Todo: ephemeral task tracking (used for agent planning visualizations)

## Install

```bash
bun install
```

## Usage

```ts
import { editorTools, grepTool } from "@magus/tools";

const { view } = editorTools();
const content = await view({ path: "README.md" });

const { grep } = grepTool();
const results = await grep({ pattern: "TODO", path: "." });
```

## Testing

```bash
bun test --filter @magus/tools
```

## Contributing

Prefer adding new capability as a discrete tool directory. Keep cross-cutting helpers in `@magus/common-utils` if shared.
