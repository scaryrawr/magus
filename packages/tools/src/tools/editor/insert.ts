import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { DiffOutputSchema, InsertFileSchema, type DiffOutput, type InsertFileInput } from "./types";

export const insert = async ({ path, line, new_str }: InsertFileInput): Promise<DiffOutput> => {
  let content = "";

  try {
    const stats = await stat(path);
    if (!stats.isFile()) {
      throw new Error("Path is not a file.");
    }
    content = await readFile(path, "utf8");
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
        await mkdir(dirname(path), { recursive: true });
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
  await writeFile(path, updatedContent, "utf8");

  const diff = createTwoFilesPatch(path, path, content, updatedContent);
  return {
    diff,
  };
};

export const createInsertTool = () =>
  ({
    insert: tool({
      description: `Use this tool to insert text at a specific location in a file.`,
      inputSchema: InsertFileSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await insert(input);
      },
    }),
  }) satisfies ToolSet;

export type InsertToolSet = ReturnType<typeof createInsertTool>;
