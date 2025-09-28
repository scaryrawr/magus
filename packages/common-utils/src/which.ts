/**
 * Cross-platform `which` implementation.
 *
 * This function locates executables in the system PATH.
 */

import { exec, execSync } from "node:child_process";
import { constants, statSync } from "node:fs";
import { access, stat } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Cross-platform check if a file exists and is executable
 */
function isExecutableSync(filePath: string): boolean {
  try {
    const stats = statSync(filePath);
    if (stats.isDirectory()) return false;
    if (!stats.isFile()) return false;

    if (process.platform === "win32") {
      // On Windows, check if it's a known executable extension or has no extension
      const ext = path.extname(filePath).toLowerCase();
      const executableExts = [
        ".exe",
        ".com",
        ".cmd",
        ".bat",
        ".ps1",
        ".ps1xml",
        ".psc1",
        ".psd1",
        ".vbs",
        ".vbe",
        ".js",
        ".jse",
        ".wsf",
        ".wsh",
        ".msi",
        ".scr", // Screen savers
        ".pif", // Program Information Files
        ".application", // ClickOnce applications
        ".gadget", // Windows gadgets
        ".msc", // Management Console snapins
        ".cpl", // Control Panel applications
        ".app", // Legacy application files
      ];
      return executableExts.includes(ext) || ext === "";
    } else {
      // On POSIX systems, check if the file is executable
      try {
        // Use access with F_OK to check existence, then check mode bits for executability
        const mode = stats.mode;
        return !!(mode & (constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH));
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Cross-platform async check if a file exists and is executable
 */
async function isExecutableAsync(filePath: string): Promise<boolean> {
  try {
    const stats = await stat(filePath);
    if (stats.isDirectory()) return false;
    if (!stats.isFile()) return false;

    if (process.platform === "win32") {
      // On Windows, check if it's a known executable extension or has no extension
      const ext = path.extname(filePath).toLowerCase();
      const executableExts = [
        ".exe",
        ".com",
        ".cmd",
        ".bat",
        ".ps1",
        ".ps1xml",
        ".psc1",
        ".psd1",
        ".vbs",
        ".vbe",
        ".js",
        ".jse",
        ".wsf",
        ".wsh", // Windows Script Host
        ".msi",
        ".scr", // Screen savers
        ".pif", // Program Information Files
        ".application", // ClickOnce applications
        ".gadget", // Windows gadgets
        ".msc", // Management Console snapins
        ".cpl", // Control Panel applications
        ".app", // Legacy application files
      ];
      return executableExts.includes(ext) || ext === "";
    } else {
      // On POSIX systems, check if the file is executable
      try {
        await access(filePath, constants.F_OK);
        const mode = stats.mode;
        return !!(mode & (constants.S_IXUSR | constants.S_IXGRP | constants.S_IXOTH));
      } catch {
        return false;
      }
    }
  } catch {
    return false;
  }
}

/**
 * Synchronously checks if a command exists in the system PATH.
 *
 * @param command - The name of the command to search for
 * @returns The full path to the executable if found, null otherwise
 */
export function which(command: string): string | null {
  if (!command) return null;

  try {
    // If command contains path separators, check it as an absolute/relative path
    if (command.includes(path.sep)) {
      return isExecutableSync(command) ? command : null;
    }

    // Use the system's which command for cross-platform compatibility
    let whichCommand: string;
    if (process.platform === "win32") {
      whichCommand = `where "${command}"`;
    } else {
      whichCommand = `which "${command}"`;
    }

    const result = execSync(whichCommand, {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();

    // Return the first line of output (in case multiple paths are returned)
    return result.split("\n")[0] || null;
  } catch {
    return null;
  }
}

/**
 * Asynchronously checks if a command exists in the system PATH.
 *
 * @param command - The name of the command to search for
 * @returns Promise that resolves to the full path if found, null otherwise
 */
export async function whichAsync(command: string): Promise<string | null> {
  if (!command) return null;

  try {
    // If command contains path separators, check it as an absolute/relative path
    if (command.includes(path.sep)) {
      return (await isExecutableAsync(command)) ? command : null;
    }

    // Use the system's which command for cross-platform compatibility (async version)
    let whichCommand: string;
    if (process.platform === "win32") {
      whichCommand = `where "${command}"`;
    } else {
      whichCommand = `which "${command}"`;
    }

    const { stdout } = await execAsync(whichCommand, {
      encoding: "utf8",
    });

    // Return the first line of output (in case multiple paths are returned)
    return stdout.trim().split("\n")[0] || null;
  } catch {
    return null;
  }
}
