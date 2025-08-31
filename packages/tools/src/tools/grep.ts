import { tool, type ToolSet } from "ai";
import { statSync } from "node:fs";
import { z } from "zod";
const { spawn, spawnSync } = Bun;

// Check if ripgrep is available
const hasRipgrep = () => {
  try {
    spawnSync(["rg", "--version"]);
    return true;
  } catch {
    return false;
  }
};

// Check if grep is available as fallback
const hasGrep = () => {
  try {
    spawnSync(["grep", "--version"]);
    return true;
  } catch {
    return false;
  }
};

const hasFindStr = () => {
  try {
    spawnSync(["findstr", "/?"]);
    return true;
  } catch {
    return false;
  }
};

// Determine which grep tool to use
const getGrepTool = (() => {
  const getGrepInternal = () => {
    if (hasRipgrep()) return "rg";
    if (hasGrep()) return "grep";
    if (hasFindStr()) return "findstr";
    return null;
  };

  let grepTool: ReturnType<typeof getGrepInternal> = null;
  return () => {
    grepTool ??= getGrepInternal();
    return grepTool;
  };
})();

export const GrepInputSchema = z.object({
  pattern: z.string().describe(`The regex pattern to search for using ${getGrepTool()} on ${process.platform}.`),
  path: z
    .string()
    .optional()
    .describe("The file or directory to search in. Defaults to a recursive search in the current directory.")
    .default(getGrepTool() === "findstr" ? "*.*" : "."),
  file_names_only: z.optional(z.boolean()).describe("Flag to return only file names with matches [default = false]."),
  ignore_case: z
    .optional(z.boolean())
    .describe("Flag to ignore casing and do a case insensitive search [default = false]."),
});

export type GrepInput = z.infer<typeof GrepInputSchema>;

export const GrepOutputSchema = z.object({
  matches: z.array(z.string()).describe("Lines matching the search pattern"),
  total_matches: z.number().describe("Total number of matches found"),
});

export type GrepOutput = z.infer<typeof GrepOutputSchema>;

export type GrepFileOptions = GrepInput & {
  grepToolOverride?: ReturnType<typeof getGrepTool>;
};

export const grepFile = async ({
  pattern,
  path,
  file_names_only,
  ignore_case,
  grepToolOverride,
}: GrepFileOptions): Promise<GrepOutput> => {
  const grepTool = grepToolOverride ?? getGrepTool();

  if (!grepTool) {
    throw new Error("A compatible grep tool (rg, grep, or findstr) is not installed or not found in PATH.");
  }

  const ignorePatterns = [".git", ".yarn", ".backfill", "node_modules"];

  const command: string[] = [grepTool];
  switch (grepTool) {
    case "rg":
      // Configure ripgrep output similar to grep
      command.push("--no-heading", "--color=never");
      break;
    case "grep":
      command.push(
        "--recursive",
        // skip binary files
        "-I",
        // exclude well known directories not to search
        ...ignorePatterns.map((dir) => `--exclude-dir=${dir}`),
      );
      break;
    case "findstr":
      command.push(
        // Recursive
        "/S",
        // Skip files with non-printable characters (binaries?)
        "/P",
        // Treat pattern as a regex (default, but let's be explicit)
        "/R",
      );
      break;
  }

  if (ignore_case) {
    switch (grepTool) {
      case "findstr":
        command.push("/I");
        break;
      case "rg":
      case "grep":
        command.push("-i");
        break;
    }
  }

  if (file_names_only) {
    switch (grepTool) {
      case "findstr":
        command.push("/M");
        break;
      case "rg":
      case "grep":
        command.push("-l");
        break;
    }
  } else {
    switch (grepTool) {
      case "rg":
        command.push("--line-number");
        break;
      case "grep":
        command.push("-n");
        break;
      case "findstr":
        command.push("/N");
        break;
    }
  }

  switch (grepTool) {
    case "findstr": {
      // Check if path is a directory to determine if we need to append *.*
      let searchPath = path;
      try {
        if (statSync(path).isDirectory()) {
          searchPath = path.endsWith("\\") ? `${path}*.*` : `${path}\\*.*`;
        }
      } catch {
        // If stat fails (e.g., pattern like *.*), use as-is
      }

      command.push(`/C:${pattern}`, searchPath);
      break;
    }
    default:
      command.push(pattern, path);
  }

  // Execute the grep command with streaming to reduce memory usage
  const proc = spawn(command);

  const matches: string[] = [];
  let buffer = "";
  const keep = (line: string) => {
    return (
      line.trim() &&
      !ignorePatterns.some(
        (pattern) =>
          line.includes(`/${pattern}/`) ||
          line.startsWith(`${pattern}/`) ||
          line.includes(`\\${pattern}\\`) ||
          line.startsWith(`${pattern}\\`),
      )
    );
  };

  for await (const chunk of proc.stdout) {
    buffer += new TextDecoder().decode(chunk);
    if (buffer.includes("\n")) {
      const split = buffer.split("\n");
      buffer = split.pop() ?? "";
      for (const line of split) {
        if (keep(line)) matches.push(line.trim());
      }
    }
  }

  // Flush trailing buffer
  if (buffer.trim() !== "") {
    const split = buffer.split("\n");
    for (const line of split) {
      if (keep(line)) matches.push(line.trim());
    }
  }

  return { matches, total_matches: matches.length };
};

export const createGrepTool = () => {
  return {
    grep: tool({
      description: `Search for patterns in files/directories using ${getGrepTool()}. Falls back to standard grep if ripgrep is not available.
This tool is essential for searching code, configuration files, or any text content.
Use this tool when you need to find specific text patterns, code snippets, or configuration values within files.
It's particularly useful for understanding existing codebase structure, finding specific functions or variables, or searching for error messages.`,
      inputSchema: GrepInputSchema,
      outputSchema: GrepOutputSchema,
      execute: async (input): Promise<GrepOutput> => {
        return await grepFile(input);
      },
    }),
  } satisfies ToolSet;
};
