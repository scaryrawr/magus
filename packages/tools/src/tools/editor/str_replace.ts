import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import fs from "node:fs/promises";
import { DiffOutputSchema, StringReplaceSchema, type DiffOutput, type StringReplaceInput } from "./types";

export const stringReplace = async ({ path, old_str, new_str }: StringReplaceInput): Promise<DiffOutput> => {
  if (old_str === new_str) {
    throw new Error("No changes made: old_str and new_str are identical.");
  }

  const stat = await fs.stat(path);
  if (!stat.isFile()) {
    throw new Error("Path is not a file.");
  }

  const content = await fs.readFile(path, "utf-8");
  const firstOccurrence = content.indexOf(old_str);
  if (firstOccurrence === -1) {
    throw new Error("The specified old_str was not found in the file.");
  }

  const lastOccurrence = content.lastIndexOf(old_str);
  if (firstOccurrence !== lastOccurrence) {
    throw new Error(
      "The specified old_str appears multiple times in the file. Aborting to avoid unintended broad edits.",
    );
  }

  const updatedContent = content.replace(old_str, new_str);
  await fs.writeFile(path, updatedContent, "utf-8");
  const diff = createTwoFilesPatch(path, path, content, updatedContent);
  return {
    diff,
  };
};

export const createStringReplaceTool = () =>
  ({
    string_replace: tool({
      description: `Replace a specific string in a file with a new string.
This tool is essential for making targeted text replacements in files.
Use this tool when you need to update specific values, change function names, or modify configuration parameters in existing files.
It's particularly useful for refactoring code, updating version numbers, or making precise text replacements in a file.
When making a replacement, include 3-5 surrounding lines to prevent replacement errors.`,
      inputSchema: StringReplaceSchema,
      outputSchema: DiffOutputSchema,
      execute: async (input): Promise<DiffOutput> => {
        return await stringReplace(input);
      },
    }),
  }) satisfies ToolSet;
