import { tool, type ToolSet } from "ai";
import { createFile } from "./create";
import { insert } from "./insert";
import { stringReplace } from "./str_replace";
import { EditorInputSchema, EditorOutputSchema, type EditorOutput } from "./types";
import { viewFile } from "./view";

export const createEditorTool = () =>
  ({
    file_edit_tool: tool({
      description: `The file edit tool supports several commands for viewing and modifying files.
This is a powerful multi-purpose editor that can create new files, view existing files, insert content at specific positions, and replace text in files.
Use this tool when you need to make detailed file modifications, create new code files, or edit existing files with precision.
The tool supports four main operations:

1. View - Read and display file contents
2. Create - Generate new files with specified content
3. Insert - Add content at specific line numbers in existing files
4. String Replace - Replace specific text patterns in files`,
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
