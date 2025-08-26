import { tool, type ToolSet } from "ai";
import fs from "node:fs/promises";
import { ViewOutputSchema, ViewSchema, type ViewInput, type ViewOutput } from "./types";

export const viewFile = async ({ path, view_range }: ViewInput): Promise<ViewOutput> => {
  const stat = await fs.stat(path);
  if (stat.isDirectory()) {
    const files = await fs.readdir(path);
    return files.join("\n");
  } else if (stat.isFile()) {
    const content = await fs.readFile(path, "utf-8");
    if (view_range) {
      const lines = content.split("\n");
      const start = Math.max(0, view_range[0] - 1);
      const end = view_range[1] === -1 ? lines.length : Math.min(lines.length, view_range[1]);
      return lines.slice(start, end).join("\n");
    }

    return content;
  } else {
    throw new Error("Path is neither a file nor a directory.");
  }
};

export const createViewTool = () =>
  ({
    view_file: tool({
      description: "Examine the contents of a file or list the contents of a directory.",
      inputSchema: ViewSchema,
      outputSchema: ViewOutputSchema,
      execute: async (input): Promise<ViewOutput> => {
        return await viewFile(input);
      },
    }),
  }) satisfies ToolSet;
