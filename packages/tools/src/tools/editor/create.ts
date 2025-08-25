import { tool, type ToolSet } from "ai";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import z from "zod";

export const createFileCreateTool = () =>
  ({
    create: tool({
      description: "Create a new file with the specified content.",
      inputSchema: z.object({
        command: z.literal("create"),
        path: z.string().describe("The path to where the new file should be created"),
        content: z.string().describe("The content to write to the new file"),
      }),
      outputSchema: z.object({}),
      execute: async ({ path, content }) => {
        // Ensure parent directory exists (create intermediate dirs as needed)
        const dir = dirname(path);
        try {
          await fs.mkdir(dir, { recursive: true });
        } catch {
          // Ignore errors; we'll catch them when we try to write the file
        }

        // Check if file already exists; fs.stat throws ENOENT if not present.
        try {
          const stat = await fs.stat(path);
          if (stat.isFile()) {
            throw new Error("File already exists at the specified path");
          }
          if (stat.isDirectory()) {
            throw new Error("A directory exists at the specified path");
          }
        } catch {
          // File does not exist, so will error
        }

        await fs.writeFile(path, content, "utf-8");
        return {};
      },
    }),
  }) satisfies ToolSet;
