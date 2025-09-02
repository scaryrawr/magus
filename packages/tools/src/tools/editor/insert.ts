import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import { DiffOutputSchema, InsertFileSchema, type DiffOutput, type InsertFileInput } from "./types";

export const insert = async ({ path, line, new_str }: InsertFileInput): Promise<DiffOutput> => {
  let content = "";

  try {
    const stat = await fs.stat(path);
    if (!stat.isFile()) {
      throw new Error("Path is not a file.");
    }
    content = await fs.readFile(path, "utf-8");
  } catch (err) {
    if (!err || typeof err !== "object") {
      throw err;
    }

    const e: Partial<NodeJS.ErrnoException> = err;
    if (e && e.code !== "ENOENT") {
      throw err;
    }

    if (line === 0) {
      // Create parent directory if needed, then treat as inserting into an empty file
      try {
        await fs.mkdir(dirname(path), { recursive: true });
      } catch {
        // ignore; writeFile will surface any real errors
      }

      content = "";
    } else {
      throw new Error("File not found.");
    }
  }

  const lines = content.split("\n");
  lines.splice(line, 0, new_str);
  const updatedContent = lines.join("\n");
  await fs.writeFile(path, updatedContent, "utf-8");

  const diff = createTwoFilesPatch(path, path, content, updatedContent);
  return {
    diff,
  };
};

export const createInsertTool = () =>
  ({
    file_insert: tool({
      description: `Insert text at a specific location in a file.
Use this tool when you need to add new code, comments, or configuration at specific locations within files.
It's particularly useful for inserting new functions, adding imports to existing files, or adding configuration values at specific line numbers.
Content will be added after the specified line number, with 0 to insert at the beginning of the file.`,
      inputSchema: InsertFileSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await insert(input);
      },
    }),
  }) satisfies ToolSet;

export type InsertToolSet = ReturnType<typeof createInsertTool>;
