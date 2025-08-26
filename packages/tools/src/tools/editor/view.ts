import fs from "node:fs/promises";
import z from "zod";

export const ViewSchema = z.object({
  command: z.literal("view"),
  path: z.string().describe("The path of the file or directory to view"),
  view_range: z
    .optional(z.tuple([z.number().describe("start line"), z.number().describe("end line")]))
    .describe(
      "An array of two integers specifying the start and end line numbers to view. Lin numbers are 1-indexed, and -1 for the end line means read to the end of the file. Only applies when viewing files, not directories",
    ),
});

export type ViewInput = Omit<z.infer<typeof ViewSchema>, "command">;

export const viewFile = async ({ path, view_range }: ViewInput) => {
  const stat = await fs.stat(path);
  if (stat.isDirectory()) {
    const files = await fs.readdir(path);
    return files.join("\n");
  } else if (stat.isFile()) {
    const content = await fs.readFile(path, "utf-8");
    if (view_range) {
      const lines = content.split("\n");
      const start = Math.max(0, view_range[0] - 1);
      const end = view_range[1] === -1 ? lines.length : Math.min(lines.length, view_range[1]);
      return lines.slice(start, end).join("\n");
    }

    return content;
  } else {
    throw new Error("Path is neither a file nor a directory");
  }
};
