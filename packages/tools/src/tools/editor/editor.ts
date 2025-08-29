import { tool, type ToolSet } from "ai";
import { createFile } from "./create";
import { insert } from "./insert";
import { stringReplace } from "./str_replace";
import { EditorInputSchema, EditorOutputSchema, type EditorOutput } from "./types";
import { viewFile } from "./view";

export const createEditorTool = () =>
  ({
    file_edit_tool: tool({
      description: "The file edit tool supports several commands for viewing and modifying files.",
      inputSchema: EditorInputSchema,
      outputSchema: EditorOutputSchema,
      execute: async (input): Promise<EditorOutput> => {
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
