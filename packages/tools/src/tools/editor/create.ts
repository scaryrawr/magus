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
    if (stat.isDirectory()) {
      throw new Error("A directory exists at the specified path");
    }
  }

  let previousContent = "";
  try {
    // It's common for the model to try using create when modifying a file.
    // they either didn't know it was there, or are just replacing the whole thing.
    // either way, they'll get a valid diff and figure it out.
    previousContent = await fs.readFile(path, "utf-8");
  } catch {
    // Ignore errors; we'll treat this as a new file
  }

  await fs.writeFile(path, content, "utf-8");
  const diff = createTwoFilesPatch(path, path, previousContent, content);
  return {
    diff,
  };
};

export const createCreateFileTool = () =>
  ({
    create_file: tool({
      description: `Create a new file or replace an existing file with specified content. Will create directories in file path.`,
      inputSchema: CreateFileSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await createFile(input);
      },
    }),
  }) satisfies ToolSet;

export type CreateFileToolSet = ReturnType<typeof createCreateFileTool>;
