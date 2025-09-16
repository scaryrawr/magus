# @magus/react

Ink + React UI components and hooks powering the Magus CLI. Provides focused, framework-agnostic primitives (ANSI rendering, markdown -> Ink, diff visualization) without business logic.

## Highlights

- Rich Markdown renderer with syntax highlighting
- Scrollable areas + viewport management utilities
- ANSI diff + streaming subprocess output components
- Hooks for terminal size + keypress handling

## Install

Monorepo managed at root:

```bash
bun install
```

## Usage

```tsx
import { Markdown, ScrollArea } from "@magus/react";

function Preview({ content }: { content: string }) {
  return (
    <ScrollArea height={20}>
      <Markdown value={content} />
    </ScrollArea>
  );
}
```

## Testing

```bash
bun test --filter @magus/react
```

## Typechecking

```bash
bun typecheck --filter @magus/react
```

## Contributing

Components should remain presentation-only. State, tool orchestration, or side effects belong in higher-level packages.
