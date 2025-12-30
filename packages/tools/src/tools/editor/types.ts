import z from "zod";

// Input schemas (discriminated by `command`)
export const ViewSchema = z.object({
  command: z.optional(z.literal("view")).describe("The view command enables you to look into files and directories."),
  path: z.string().describe("The path of the file or directory to view."),
  view_range: z
    .optional(
      z.object({
        start: z.number().describe("The start line number. 1-indexed"),
        end: z.number().describe("The end line number. 1-indexed, -1 means read to the end of the file"),
      }),
    )
    .describe(
      "An object specifying the start and end line numbers to view. Line numbers are 1-indexed, and -1 for the end line means read to the end of the file. Only applies when viewing files, not directories.",
    ),
});

export const CreateFileSchema = z.object({
  command: z.optional(z.literal("create")).describe("The create command enables you to create new files."),
  path: z.string().describe("The path to where the new file should be created."),
  content: z.string().describe("The content to write to the new file."),
});

export const InsertFileSchema = z.object({
  command: z
    .optional(z.literal("insert"))
    .describe("The insert command enables you to insert content into existing files."),
  path: z.string().describe("The path to the file to modify."),
  line: z.number().describe("The line number to insert the content at (0 to insert at the beginning of the file)."),
  new_str: z.string().describe("The text to insert."),
});

export const StringReplaceSchema = z.object({
  command: z
    .optional(z.literal("replace"))
    .describe("The replace command enables you to replace text in existing files."),
  path: z.string().describe("The path to the file to modify."),
  old_str: z.string().describe("The text to replace (must match exactly, including whitespace and indentation)."),
  new_str: z.string().describe("The new text to insert in place of the old text."),
  replace_all: z.optional(z.boolean()).describe("Flag to replace all occurrences of the old text. [default = false]"),
});

// Output schemas (discriminated by `type`)
export const DiffOutputSchema = z.object({
  diff: z.string().describe("A diff showing the changes made to the file"),
});

export const ViewOutputSchema = z.object({
  content: z.string().describe("The content of the file or directory listing when using the view command"),
});

// Union schemas
export const EditorInputSchema = z.union([
  ViewSchema.required({ command: true }),
  CreateFileSchema.required({ command: true }),
  InsertFileSchema.required({ command: true }),
  StringReplaceSchema.required({ command: true }),
]);

export const EditorOutputSchema = z.union([ViewOutputSchema, DiffOutputSchema]);

export type DiffOutput = z.infer<typeof DiffOutputSchema>;
export type EditorInput = z.infer<typeof EditorInputSchema>;
export type EditorOutput = z.infer<typeof EditorOutputSchema>;
export type ViewInput = Omit<z.infer<typeof ViewSchema>, "command">;
export type ViewOutput = z.infer<typeof ViewOutputSchema>;
export type CreateFileInput = Omit<z.infer<typeof CreateFileSchema>, "command">;
export type InsertFileInput = Omit<z.infer<typeof InsertFileSchema>, "command">;
export type StringReplaceInput = Omit<z.infer<typeof StringReplaceSchema>, "command">;

export type EditorOutputPlugin = Record<string, (path: string) => string | Promise<string>>;

/**
 * @deprecated EditorOutputPlugin is no longer supported. Output is always plain.
 */
export type _EditorOutputPlugin = EditorOutputPlugin;
