import { gitignore, gitignoreFilter, which } from "@magus/common-utils";
import { tool, type ToolSet } from "ai";
import { spawn } from "node:child_process";
import { z } from "zod";

const hasFd = () => {
  return !!which("fd");
};

const hasRipgrep = () => {
  return !!which("rg");
};

const hasFind = () => {
  // Don't fall for the find on windows.
  if (process.platform === "win32") return false;
  return !!which("find");
};

const hasPwsh = () => {
  return !!which("pwsh");
};

const hasPowerShell = () => {
  return !!which("powershell");
};

// Determine which glob tool to use
const getFindTool = (() => {
  const getFindInternal = () => {
    if (hasFd()) return "fd";
    if (hasRipgrep()) return "rg";
    if (hasFind()) return "find";
    if (hasPwsh()) return "pwsh";
    if (hasPowerShell()) return "powershell";
    return undefined;
  };

  let findTool: ReturnType<typeof getFindInternal> = undefined;
  return () => {
    findTool ??= getFindInternal();
    return findTool;
  };
})();

export const GlobInputSchema = z.object({
  pattern: z
    .optional(z.string())
    .describe(
      `The optional file glob pattern to use for finding files. Default behavior will list all files recursively.`,
    ),
  path: z.optional(z.string()).describe("The directory to search in. Defaults to current directory.").default("."),
});

export type GlobInput = z.infer<typeof GlobInputSchema>;

export const GlobOutputSchema = z.object({
  files: z.array(z.string()).describe("List of file paths matching the glob pattern"),
  total_matches: z.number().describe("Total number of files found"),
});

export type GlobOutput = z.infer<typeof GlobOutputSchema>;

export type GlobFileOptions = GlobInput & {
  findToolOverride?: ReturnType<typeof getFindTool>;
};

export const globFile = async ({
  pattern,
  path: originalPath,
  findToolOverride,
}: GlobFileOptions): Promise<GlobOutput> => {
  const findTool = findToolOverride ?? getFindTool();

  // In the case where we get empty string from the LLM vs undefined, treat it as PWD.
  const path = originalPath || ".";

  if (!findTool) {
    // todo: implement a fallback file search
    throw new Error("No suitable find tool found on the system.");
  }

  let command: string[];
  switch (findTool) {
    case "rg":
      command = [findTool, "--files", path];
      if (pattern) command.push("--iglob", `*${pattern}*`);
      break;
    case "find":
      // Use standard Unix find: search under path for files (-type f) with case-insensitive name match
      // Note: BSD/macOS find supports -iname
      command = [findTool, path];
      if (pattern) command.push("-iname", `*${pattern}*`);
      break;
    case "fd":
      command = [findTool, pattern === "*" ? "." : (pattern ?? "."), path];
      break;
    case "pwsh":
    case "powershell":
      command = [
        findTool,
        "-NoProfile",
        "-NoLogo",
        "-Command",
        pattern
          ? `Get-ChildItem -Path '${path}' -Recurse -Filter '*${pattern}*' | Select-Object -ExpandProperty FullName`
          : `Get-ChildItem -Path '${path}' -Recurse | Select-Object -ExpandProperty FullName`,
      ];
      break;
  }

  // Execute the find command asynchronously
  const [cmd, ...args] = command;
  const proc = spawn(cmd, args, { stdio: ["ignore", "pipe", "pipe"] });

  // Collect stdout asynchronously
  const files = [];
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
      if (code === 0) {
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
    files.push(...lines.filter(keep).map((line) => line.replace(process.cwd(), ".")));
  }

  return {
    files,
    total_matches: files.length,
  };
};

export const createGlobTool = () => {
  return {
    glob: tool({
      description: `Use this tool when you need to find specific files, such as configuration files, source code files, or test files.
      It's particularly useful for exploring the project structure and finding files that match specific naming conventions.`,
      inputSchema: GlobInputSchema,
      outputSchema: GlobOutputSchema,
      execute: async (input): Promise<GlobOutput> => {
        return await globFile(input);
      },
    }),
  } satisfies ToolSet;
};

export type GlobToolSet = ReturnType<typeof createGlobTool>;
