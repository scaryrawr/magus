import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import { stat } from "node:fs/promises";
import { DiffOutputSchema, StringReplaceSchema, type DiffOutput, type StringReplaceInput } from "./types";

export const stringReplace = async ({
  path,
  old_str,
  new_str,
  replace_all,
}: StringReplaceInput): Promise<DiffOutput> => {
  if (old_str === new_str) {
    throw new Error("No changes made: old_str and new_str are identical.");
  }

  const file_stat = await stat(path);
  if (!file_stat.isFile()) {
    throw new Error("Path is not a file.");
  }

  const content = await Bun.file(path).text();
  const firstOccurrence = content.indexOf(old_str);
  if (firstOccurrence === -1) {
    throw new Error("No changes made: old_str was not found in the file.");
  }

  const updatedContent = replace_all ? content.replaceAll(old_str, new_str) : content.replace(old_str, new_str);
  await Bun.write(path, updatedContent);
  const diff = createTwoFilesPatch(path, path, content, updatedContent);
  return {
    diff,
  };
};

export const createStringReplaceTool = () =>
  ({
    replace: tool({
      description: `Replace a specific string in a file with a new string.
      Use this tool when you need to update specific values, change function names,
      or modify configuration parameters in existing files.`,
      inputSchema: StringReplaceSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await stringReplace(input);
      },
    }),
  }) satisfies ToolSet;

export type StringReplaceToolSet = ReturnType<typeof createStringReplaceTool>;
