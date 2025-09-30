import { DEFAULT_IGNORE_PATTERNS, gitignore, gitignoreFilter, which } from "@magus/common-utils";
import { tool, type ToolSet } from "ai";
import { spawn } from "node:child_process";
import { statSync } from "node:fs";
import { z } from "zod";

// Check if ripgrep is available
const hasRipgrep = () => {
  return !!which("rg");
};

// Check if grep is available as fallback
const hasGrep = () => {
  return !!which("grep");
};

const hasFindStr = () => {
  return !!which("findstr");
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
        ...DEFAULT_IGNORE_PATTERNS.map((dir) => `--exclude-dir=${dir}`),
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
  const [cmd, ...args] = command;
  const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

  const matches: string[] = [];
  const relativeIgnore = path && path !== "." ? await gitignoreFilter(path) : { ignores: () => false };
  const keep = (line: string) => !gitignore.ignores(line) && !relativeIgnore.ignores(line);

  // Wait for the process to complete and collect all output
  const output = await new Promise<string>((resolve, reject) => {
    let data = "";
    let errorData = "";

    proc.stdout?.on("data", (chunk: Buffer) => {
      data += chunk.toString();
    });

    proc.stderr?.on("data", (chunk: Buffer) => {
      errorData += chunk.toString();
    });

    proc.on("close", (code) => {
      clearTimeout(timeout);
      // grep returns exit code 1 when no matches are found, which is not an error
      if (code === 0 || code === 1) {
        resolve(data);
      } else {
        reject(new Error(`Process exited with code ${code}${errorData ? `: ${errorData}` : ""}`));
      }
    });

    proc.on("error", (error) => {
      clearTimeout(timeout);
      reject(error);
    });

    // Set a timeout to prevent hanging
    const timeout = setTimeout(() => {
      proc.kill();
      reject(new Error("Process timeout"));
    }, 30000);
  });

  // Process the complete output
  if (output) {
    const lines = output
      .split("\n")
      .map((line) => line.trim())
      .filter((line) => line);
    matches.push(...lines.filter(keep).map((line) => line.replace(process.cwd(), ".")));
  }

  return { matches, total_matches: matches.length };
};

const grepTool = tool({
  description: `Use this tool when you need to find specific text patterns, code snippets, or configuration values within files.`,
  inputSchema: GrepInputSchema,
  outputSchema: GrepOutputSchema,
  execute: async (input): Promise<GrepOutput> => {
    return await grepFile(input);
  },
});

export const createGrepTool = () => {
  return {
    grep: grepTool,
  } satisfies ToolSet;
};

export const createSearchTool = () => {
  return {
    search: grepTool,
  } satisfies ToolSet;
};

export type GrepToolSet = ReturnType<typeof createGrepTool> & ReturnType<typeof createSearchTool>;
