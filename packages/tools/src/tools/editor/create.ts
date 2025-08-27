import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import { CreateFileSchema, DiffOutputSchema, type CreateFileInput, type DiffOutput } from "./types";

export const createFile = async ({ path, content }: CreateFileInput): Promise<DiffOutput> => {
  // Ensure parent directory exists (create intermediate dirs as needed)
  const dir = dirname(path);
  try {
    await fs.mkdir(dir, { recursive: true });
  } catch {
    // Ignore errors; we'll catch them when we try to write the file
  }

  // Check if file already exists; fs.stat throws ENOENT if not present.
  let stat: { isFile: () => boolean; isDirectory: () => boolean } | undefined;
  try {
    stat = await fs.stat(path);
  } catch (err) {
    if (!err || typeof err !== "object") {
      throw err;
    }

    const e: Partial<NodeJS.ErrnoException> = err;
    if (!e || e.code !== "ENOENT") {
      throw err; // rethrow unexpected errors
    }
  }

  if (stat) {
    if (stat.isFile()) {
      throw new Error("File already exists at the specified path");
    }
    if (stat.isDirectory()) {
      throw new Error("A directory exists at the specified path");
    }
  }

  await fs.writeFile(path, content, "utf-8");
  const diff = createTwoFilesPatch(path, path, "", content);
  return {
    diff,
  };
};

export const createCreateFileTool = () =>
  ({
    create_file: tool({
      description: "Create a new file with specified content.",
      inputSchema: CreateFileSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await createFile(input);
      },
    }),
  }) satisfies ToolSet;
