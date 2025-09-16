# @magus/react-tools

Ink React components that render AI tool interactions (file editing, grep, shell output, todo management) used by the Magus CLI application layer.

## Features

- Uniform `ToolView` layout wrapper
- File view / diff / create / insert components
- Grep + glob output visualization
- Shell streaming output renderer
- Todo tool state visualization

## Install

Managed at workspace root:

```bash
bun install
```

## Usage

```tsx
import { ToolView, GrepTool } from "@magus/react-tools";

export function GrepExample() {
  return (
    <ToolView title="Search">
      <GrepTool pattern="TODO" files={["src/index.ts", "README.md"]} />
    </ToolView>
  );
}
```

## Testing

```bash
bun test --filter @magus/react-tools
```

## Contributing

Keep components thin wrappers over data provided by `@magus/tools` to preserve separation of concerns.
