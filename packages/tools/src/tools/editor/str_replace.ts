import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import { readFile, stat, writeFile } from "node:fs/promises";
import {
  DiffOutputSchema,
  StringReplaceSchema,
  type DiffOutput,
  type EditorOutputPlugin,
  type StringReplaceInput,
} from "./types";

export const stringReplace = async (
  { path, old_str, new_str, replace_all }: StringReplaceInput,
  plugins?: EditorOutputPlugin,
): Promise<DiffOutput> => {
  if (old_str === new_str) {
    throw new Error("No changes made: old_str and new_str are identical.");
  }

  const file_stat = await stat(path);
  if (!file_stat.isFile()) {
    throw new Error("Path is not a file.");
  }

  const content = await readFile(path, "utf8");
  const firstOccurrence = content.indexOf(old_str);
  if (firstOccurrence === -1) {
    throw new Error("No changes made: old_str was not found in the file.");
  }

  const updatedContent = replace_all ? content.replaceAll(old_str, new_str) : content.replace(old_str, new_str);
  await writeFile(path, updatedContent, "utf8");

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

  const diff = createTwoFilesPatch(path, path, content, updatedContent);
  return {
    ...pluginResults,
    diff,
  };
};

export const createStringReplaceTool = (plugins?: EditorOutputPlugin) =>
  ({
    replace: tool({
      description: `Replace a specific string in a file with a new string.
      Use this tool when you need to update specific values, change function names,
      or modify configuration parameters in existing files.`,
      inputSchema: StringReplaceSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await stringReplace(input, plugins);
      },
    }),
  }) satisfies ToolSet;

export type StringReplaceToolSet = ReturnType<typeof createStringReplaceTool>;
