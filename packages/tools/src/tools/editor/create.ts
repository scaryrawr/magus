import { tool, type ToolSet } from "ai";
import fs from "node:fs/promises";
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
        const stat = await fs.stat(path);
        if (stat.isFile()) {
          throw new Error("File already exists at the specified path");
        }

        await fs.writeFile(path, content, "utf-8");
        return {};
      },
    }),
  }) satisfies ToolSet;
