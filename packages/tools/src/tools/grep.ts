import { tool, type ToolSet } from "ai";
import { spawnSync } from "node:child_process";
import { z } from "zod";

// Check if ripgrep is available
const hasRipgrep = () => {
  try {
    spawnSync("rg", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

// Check if grep is available as fallback
const hasGrep = () => {
  try {
    spawnSync("grep", ["--version"], { stdio: "ignore" });
    return true;
  } catch {
    return false;
  }
};

const hasFindStr = () => {
  try {
    spawnSync("findstr", ["/?"], { stdio: "ignore" });
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
  file_names_only: z
    .boolean()
    .describe("Flag to return only file names with matches [default = false].")
    .default(false),
  ignore_case: z
    .boolean()
    .describe("Flag to ignore casing and do a case insensitive search [default = false].")
    .default(false),
});

export type GrepInput = z.infer<typeof GrepInputSchema>;

export const GrepOutputSchema = z.object({
  matches: z.array(z.string()).describe("Lines matching the search pattern"),
  total_matches: z.number().describe("Total number of matches found"),
});

export type GrepOutput = z.infer<typeof GrepOutputSchema>;

export const grepFile = async ({ pattern, path, file_names_only, ignore_case }: GrepInput): Promise<GrepOutput> => {
  const grepTool = getGrepTool();

  if (!grepTool) {
    throw new Error("A compatible grep tool (rg, grep, or findstr) is not installed or not found in PATH.");
  }

  const args: string[] = [];
  switch (grepTool) {
    case "rg":
      break;
    case "grep":
      args.push(
        // recursive
        "-r",
        // skip binary files
        "-I",
        // exclude certain directories
        "--exclude-dir=.git",
        "--exclude-dir=node_modules",
      );
      break;
    case "findstr":
      args.push(
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
        args.push("/I");
        break;
      case "rg":
      case "grep":
        args.push("-i");
        break;
    }
  }

  if (file_names_only) {
    switch (grepTool) {
      case "findstr":
        args.push("/M");
        break;
      case "rg":
      case "grep":
        args.push("-l");
        break;
    }
  } else {
    switch (grepTool) {
      case "grep":
        args.push("-n");
        break;
      case "findstr":
        args.push("/N");
        break;
    }
  }

  // Use `/C` for findstr so it doesn't treat spaces as separate patterns
  const patternOption = grepTool === "findstr" ? `/C:${pattern}` : pattern;
  args.push(patternOption, path);

  // Execute the grep command
  const result = spawnSync(grepTool, args, { encoding: "utf-8" });
  if (result.status !== 0) {
    throw new Error(`Grep command failed with error: ${result.stderr || result.stdout}`);
  }

  const matches = result.stdout.trim() ? result.stdout.trim().split("\n") : [];

  return {
    matches,
    total_matches: matches.length,
  };
};

export const createGrepTool = () => {
  return {
    grep: tool({
      description: `Search for patterns in files/directories using ${getGrepTool()}. Falls back to standard grep if ripgrep is not available.`,
      inputSchema: GrepInputSchema,
      outputSchema: GrepOutputSchema,
      execute: async (input): Promise<GrepOutput> => {
        return await grepFile(input);
      },
    }),
  } satisfies ToolSet;
};
