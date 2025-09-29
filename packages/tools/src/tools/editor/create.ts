import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import { mkdir, readFile, stat, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import {
  CreateFileSchema,
  DiffOutputSchema,
  type CreateFileInput,
  type DiffOutput,
  type EditorOutputPlugin,
} from "./types";

export const createFile = async (
  { path, content }: CreateFileInput,
  plugins?: EditorOutputPlugin,
): Promise<DiffOutput> => {
  // Ensure parent directory exists (create intermediate dirs as needed)
  const dir = dirname(path);
  try {
    await mkdir(dir, { recursive: true });
  } catch {
    // Ignore errors; we'll catch them when we try to write the file
  }

  // Check if file already exists; fs.stat throws ENOENT if not present.
  let stats: { isFile: () => boolean; isDirectory: () => boolean } | undefined;
  try {
    stats = await stat(path);
  } catch (err) {
    if (!err || typeof err !== "object") {
      throw err;
    }

    const e: Partial<NodeJS.ErrnoException> = err;
    if (!e || e.code !== "ENOENT") {
      throw err; // rethrow unexpected errors
    }
  }

  if (stats) {
    if (stats.isDirectory()) {
      throw new Error("A directory exists at the specified path");
    }
  }

  let previousContent = "";
  try {
    // It's common for the model to try using create when modifying a file.
    // they either didn't know it was there, or are just replacing the whole thing.
    // either way, they'll get a valid diff and figure it out.
    previousContent = await readFile(path, "utf8");
  } catch {
    // Ignore errors; we'll treat this as a new file
  }

  await writeFile(path, content, "utf8");
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

  const diff = createTwoFilesPatch(path, path, previousContent, content);
  return {
    ...pluginResults,
    diff,
  };
};

export const createCreateFileTool = (plugins?: EditorOutputPlugin) =>
  ({
    create: tool({
      description: `Create a new file or replace an existing file with specified content. Will create directories in file path.`,
      inputSchema: CreateFileSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await createFile(input, plugins);
      },
    }),
  }) satisfies ToolSet;

export type CreateFileToolSet = ReturnType<typeof createCreateFileTool>;
