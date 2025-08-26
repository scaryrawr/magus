import { createTwoFilesPatch } from "diff";
import fs from "node:fs/promises";
import { dirname } from "node:path";
import z from "zod";

export const InsertFileSchema = z.object({
  command: z.literal("insert"),
  path: z.string().describe("The path to the file to modify"),
  insert_line: z.number().describe("The line number to insert the content at (0 for beginning of the file)"),
  new_str: z.string().describe("The text to insert"),
});

export type InsertFileInput = Omit<z.infer<typeof InsertFileSchema>, "command">;

export const insert = async ({ path, insert_line, new_str }: InsertFileInput) => {
  let content = "";

  try {
    const stat = await fs.stat(path);
    if (!stat.isFile()) {
      throw new Error("Path is not a file");
    }
    content = await fs.readFile(path, "utf-8");
  } catch (err) {
    if (!err || typeof err !== "object") {
      throw err;
    }

    const e: Partial<NodeJS.ErrnoException> = err;
    if (e && e.code !== "ENOENT") {
      throw err;
    }

    if (insert_line === 0) {
      // Create parent directory if needed, then treat as inserting into an empty file
      try {
        await fs.mkdir(dirname(path), { recursive: true });
      } catch {
        // ignore; writeFile will surface any real errors
      }

      content = "";
    } else {
      throw new Error("File not found");
    }
  }

  const lines = content.split("\n");
  lines.splice(insert_line, 0, new_str);
  const updatedContent = lines.join("\n");
  await fs.writeFile(path, updatedContent, "utf-8");

  const diff = createTwoFilesPatch(path, path, content, updatedContent);
  return {
    diff,
  };
};
