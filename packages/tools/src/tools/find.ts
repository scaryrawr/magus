import { tool, type ToolSet } from "ai";
import { z } from "zod";
const { spawn, spawnSync } = Bun;

const hasFd = () => {
  try {
    spawnSync(["fd", "--version"]);
    return true;
  } catch {
    return false;
  }
};

const hasRipgrep = () => {
  try {
    spawnSync(["rg", "--version"]);
    return true;
  } catch {
    return false;
  }
};

const hasFind = () => {
  // Don't fall for the find on windows.
  if (process.platform === "win32") return false;

  try {
    // This actually errors 🤣, cause find does not support --version.,
    // but... it doesn't throw because find gets ran.
    spawnSync(["find", "--version"]);
    return true;
  } catch {
    return false;
  }
};

const hasPwsh = () => {
  try {
    spawnSync(["pwsh", "--version"]);
    return true;
  } catch {
    return false;
  }
};

const hasPowerShell = () => {
  try {
    spawnSync(["powershell", "--version"]);
    return true;
  } catch {
    return false;
  }
};

// Determine which find tool to use
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

export const FindInputSchema = z.object({
  pattern: z
    .optional(z.string())
    .describe(
      `The optional file glob pattern to use for finding files. Default behavior will list all files recursively.`,
    ),
  path: z.optional(z.string()).describe("The directory to search in. Defaults to current directory.").default("."),
});

export type FindInput = z.infer<typeof FindInputSchema>;

export const FindOutputSchema = z.object({
  files: z.array(z.string()).describe("List of file paths matching the glob pattern"),
  total_matches: z.number().describe("Total number of files found"),
});

export type FindOutput = z.infer<typeof FindOutputSchema>;

export type FindFileOptions = FindInput & {
  findToolOverride?: ReturnType<typeof getFindTool>;
};

export const findFile = async ({ pattern, path, findToolOverride }: FindFileOptions): Promise<FindOutput> => {
  const findTool = findToolOverride ?? getFindTool();

  if (!findTool) {
    // todo: implement a fallback file search
    throw new Error("No suitable find tool found on the system.");
  }

  let command: string[];
  switch (findTool) {
    case "rg":
      command = [findTool, "--files", path];
      if (pattern) command.push("--iglob", `'*${pattern}*'`);
      break;
    case "find":
      // Use standard Unix find: search under path for files (-type f) with case-insensitive name match
      // Note: BSD/macOS find supports -iname
      command = [findTool, path];
      if (pattern) command.push("-iname", `*${pattern}*`);
      break;
    case "fd":
      command = [findTool, pattern ?? ".", path];
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
  const proc = spawn(command);
  const ignorePatterns = [".git", ".yarn", ".backfill", "node_modules"];

  // Collect stdout asynchronously
  const files = [];
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

  let stdout = "";
  for await (const chunk of proc.stdout) {
    stdout += new TextDecoder().decode(chunk);
    if (stdout.includes("\n")) {
      const newFiles = stdout.split("\n");
      stdout = newFiles.pop() ?? "";
      files.push(...newFiles.filter(keep).map((line) => line.replace(process.cwd(), ".").trim()));
    }
  }

  // Trailing contents
  if (stdout) {
    const newFiles = stdout.split("\n");
    files.push(...newFiles.filter(keep).map((line) => line.replace(process.cwd(), ".").trim()));
  }

  return {
    files,
    total_matches: files.length,
  };
};

export const createFindTool = () => {
  return {
    find: tool({
      description: `Recursively search for files with a given name pattern.
      This tool is essential for locating files in the codebase by filename or pattern.
      Use this tool when you need to find specific files, such as configuration files, source code files, or test files.
      It's particularly useful for exploring the project structure and finding files that match specific naming conventions.`,
      inputSchema: FindInputSchema,
      outputSchema: FindOutputSchema,
      execute: async (input): Promise<FindOutput> => {
        return await findFile(input);
      },
    }),
  } satisfies ToolSet;
};
