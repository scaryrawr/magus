/**
 * Cross-platform `which` implementation.
 *
 * This function locates executables in the system PATH.
 */

import { exec, execSync } from "node:child_process";
import { promisify } from "node:util";

const execAsync = promisify(exec);

/**
 * Synchronously checks if a command exists in the system PATH.
 *
 * @param command - The name of the command to search for
 * @returns The full path to the executable if found, null otherwise
 */
export function which(command: string): string | null {
  if (!command) return null;

  try {
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
