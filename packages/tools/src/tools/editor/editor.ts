import { tool, type ToolSet } from "ai";
import { createFile } from "./create";
import { insert } from "./insert";
import { stringReplace } from "./str_replace";
import { EditorInputSchema, EditorOutputSchema, type EditorInput, type EditorOutput } from "./types";
import { viewFile } from "./view";

export const createEditorTool = () => {
  const viewExample = JSON.stringify({ command: "view", path: "./path/to/file_or_directory" } satisfies EditorInput);

  const createExample = JSON.stringify({
    command: "create",
    path: "./path/to/new_file",
    content: "File content",
  } satisfies EditorInput);

  const insertExample = JSON.stringify({
    command: "insert",
    path: "./path/to/existing_file",
    new_str: "New content",
    line: 5,
  } satisfies EditorInput);

  const replaceExample = JSON.stringify({
    command: "replace",
    path: "./path/to/existing_file",
    old_str: "old",
    new_str: "new",
  } satisfies EditorInput);

  return {
    file_interaction_tool: tool({
      description: `The file interaction tool supports several commands for viewing and modifying files.
      This is a powerful multi-purpose editor that can create files, view existing files and folders, insert content at specific positions, and replace text in files.
      Use this tool when you need to make detailed file modifications, create new code files, or edit existing files with precision.
      The tool supports four main operations:
      
      - view - ${viewExample}
      - create - ${createExample}
      - insert - ${insertExample}
      - replace - ${replaceExample}`,
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
          case "replace": {
            return stringReplace(input);
          }
        }
      },
    }),
  } satisfies ToolSet;
};

export type EditorToolSet = ReturnType<typeof createEditorTool>;
