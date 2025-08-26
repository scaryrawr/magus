import z from "zod";

// Input schemas (discriminated by `command`)
export const ViewSchema = z.object({
  command: z.literal("view"),
  path: z.string().describe("The path of the file or directory to view."),
  view_range: z
    .tuple([z.number().describe("start line"), z.number().describe("end line")])
    .optional()
    .describe(
      "An array of two integers specifying the start and end line numbers to view. Lin numbers are 1-indexed, and -1 for the end line means read to the end of the file. Only applies when viewing files, not directories.",
    ),
});

export const CreateFileSchema = z.object({
  command: z.literal("create"),
  path: z.string().describe("The path to where the new file should be created."),
  content: z.string().describe("The content to write to the new file."),
});

export const InsertFileSchema = z.object({
  command: z.literal("insert"),
  path: z.string().describe("The path to the file to modify."),
  insert_line: z.number().describe("The line number to insert the content at (0 for beginning of the file)."),
  new_str: z.string().describe("The text to insert."),
});

export const StringReplaceSchema = z.object({
  command: z.literal("str_replace"),
  path: z.string().describe("The path to the file to modify."),
  old_str: z.string().describe("The text to replace (must match exactly, including whitespace and indentation)."),
  new_str: z.string().describe("The new text to insert in place of the old text."),
});

// Output schemas (discriminated by `type`)
export const DiffOutputSchema = z.object({
  type: z.literal("diff"),
  diff: z.string().describe("A diff showing the changes made to the file"),
});

export const ViewOutputSchema = z
  .string()
  .describe("The content of the file or directory listing when using the view command");

// Union schemas
export const EditorInputSchema = z.discriminatedUnion("command", [
  ViewSchema,
  CreateFileSchema,
  InsertFileSchema,
  StringReplaceSchema,
]);

export const EditorOutputSchema = z.union([ViewOutputSchema, DiffOutputSchema]);

export type DiffOutput = z.infer<typeof DiffOutputSchema>;
export type EditorOutput = z.infer<typeof EditorOutputSchema>;
export type ViewInput = Omit<z.infer<typeof ViewSchema>, "command">;
export type ViewOutput = z.infer<typeof ViewOutputSchema>;
export type CreateFileInput = Omit<z.infer<typeof CreateFileSchema>, "command">;
export type InsertFileInput = Omit<z.infer<typeof InsertFileSchema>, "command">;
export type StringReplaceInput = Omit<z.infer<typeof StringReplaceSchema>, "command">;
