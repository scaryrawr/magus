import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import fs from "node:fs/promises";
import z from "zod";

export const createInsertTool = () =>
  ({
    create: tool({
      description: "Insert content into an existing file.",
      inputSchema: z.object({
        command: z.literal("insert"),
        path: z.string().describe("The path to the file to modify"),
        insert_line: z.number().describe("The line number to insert the content at (0 for beginning of the file)"),
        new_str: z.string().describe("The text to insert"),
      }),
      outputSchema: z.object({
        diff: z.string().describe("A diff showing the changes made to the file"),
      }),
      execute: async ({ path, insert_line, new_str }) => {
        const stat = await fs.stat(path);
        if (!stat.isFile()) {
          throw new Error("Path is not a file");
        }

        const content = await fs.readFile(path, "utf-8");
        const lines = content.split("\n");
        lines.splice(insert_line, 0, new_str);
        const updatedContent = lines.join("\n");
        await fs.writeFile(path, updatedContent, "utf-8");

        const diff = createTwoFilesPatch(path, path, content, updatedContent);
        return {
          diff,
        };
      },
    }),
  }) satisfies ToolSet;
