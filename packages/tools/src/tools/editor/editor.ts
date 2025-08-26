import { tool, type ToolSet } from "ai";
import z from "zod";
import { createFile, CreateFileSchema } from "./create";
import { insert, InsertFileSchema } from "./insert";
import { stringReplace, StringReplaceSchema } from "./str_replace";
import { viewFile, ViewSchema } from "./view";

export const createEditorTool = () =>
  ({
    file_edit_tool: tool({
      description: "The text editor tool supports several commands for viewing and modifying files.",
      inputSchema: z.union([ViewSchema, CreateFileSchema, InsertFileSchema, StringReplaceSchema]),
      outputSchema: z.union([
        z.string().describe("The content of the file or directory listing when using the view command"),
        z.object({
          diff: z.string().describe("A diff showing the changes made to the file"),
        }),
      ]),
      execute: async (input) => {
        switch (input.command) {
          case "view": {
            return viewFile(input);
          }
          case "create": {
            return createFile(input);
          }
          case "insert": {
            return insert(input);
          }
          case "str_replace": {
            return stringReplace(input);
          }
        }
      },
    }),
  }) satisfies ToolSet;
