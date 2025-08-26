import { tool, type ToolSet } from "ai";
import { createTwoFilesPatch } from "diff";
import fs from "node:fs/promises";
import z from "zod";

export const StringReplaceSchema = z.object({
  command: z.literal("str_replace"),
  path: z.string().describe("The path to the file to modify."),
  old_str: z.string().describe("The text to replace (must match exactly, including whitespace and indentation)."),
  new_str: z.string().describe("The new text to insert in place of the old text."),
});

export type StringReplaceInput = Omit<z.infer<typeof StringReplaceSchema>, "command">;

export const stringReplace = async ({ path, old_str, new_str }: StringReplaceInput) => {
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
    type: "diff",
    diff,
  };
};

export const createStringReplaceTool = () =>
  ({
    string_replace: tool({
      description:
        "Replace a specific string in a file with a new string. This is used for making precise edits. Include 3-5 surrounding lines of context to isolate the change.",
      inputSchema: StringReplaceSchema,
      outputSchema: z.object({
        type: z.literal("diff"),
        diff: z.string().describe("A diff showing the changes made to the file"),
      }),
      execute: async (input) => {
        return stringReplace(input);
      },
    }),
  }) satisfies ToolSet;
