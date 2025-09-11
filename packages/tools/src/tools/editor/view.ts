import { tool, type ToolSet } from "ai";
import { readdir, stat } from "node:fs/promises";
import { ViewOutputSchema, ViewSchema, type EditorOutputPlugin, type ViewInput, type ViewOutput } from "./types";

export const viewFile = async ({ path, view_range }: ViewInput, plugins?: EditorOutputPlugin): Promise<ViewOutput> => {
  const stats = await stat(path);
  if (stats.isDirectory()) {
    const files = await readdir(path);
    return {
      content: files.join("\n"),
    };
  } else if (stats.isFile()) {
    let content = await Bun.file(path).text();
    await Bun.write(path, content);
    const pluginResults = (
      await Promise.all(
        Object.entries(plugins || {}).map(async ([name, fn]) => {
          const result = await fn(path);
          return result
            ? {
                [name]: result,
              }
            : {};
        }),
      )
    ).reduce((acc, val) => ({ ...acc, ...val }), {});

    if (view_range) {
      const lines = content.split("\n");
      const start = Math.max(0, view_range[0] - 1);
      const end = view_range[1] === -1 ? lines.length : Math.min(lines.length, view_range[1]);
      content = lines.slice(start, end).join("\n");
    }

    return {
      content,
      ...pluginResults,
    };
  } else {
    throw new Error("Path is neither a file nor a directory.");
  }
};

export const createViewTool = (plugins?: EditorOutputPlugin) =>
  ({
    view: tool({
      description: `Examine the contents of a file or directory.
      This tool is essential for reading and examining file contents in the codebase.
      Use this tool when you need to understand existing code, configuration files, or any text content in the project.
      It's particularly useful for reviewing implementation details, understanding code structure, or examining configuration files before making changes.
      When viewing a directory, it lists all files and subdirectories in that location.`,
      inputSchema: ViewSchema,
      outputSchema: ViewOutputSchema,
      execute: async (input): Promise<ViewOutput> => {
        return await viewFile(input, plugins);
      },
    }),
  }) satisfies ToolSet;

export type ViewToolSet = ReturnType<typeof createViewTool>;
