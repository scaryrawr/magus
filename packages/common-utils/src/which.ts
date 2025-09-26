/**
 * Cross-platform `which` implementation that doesn't depend on Bun runtime.
 *
 * This function locates executables in the system PATH, providing the same
 * functionality as `Bun.which()` but with broader runtime compatibility.
 */

import { execSync } from "node:child_process";
import { constants } from "node:fs";
import { access } from "node:fs/promises";
import path from "node:path";

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
      try {
        // Use execSync to avoid async complications while maintaining Node.js compatibility
        execSync(`test -x "${command}"`, { stdio: "ignore" });
        return command;
      } catch {
        return null;
      }
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
      try {
        await access(command, constants.F_OK | constants.X_OK);
        return command;
      } catch {
        return null;
      }
    }

    // For commands in PATH, fall back to sync version for simplicity
    // Could be improved with async child_process.exec if needed
    return which(command);
  } catch {
    return null;
  }
}
