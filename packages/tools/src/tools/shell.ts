/**
 * Shell Session Manager for Persistent Command Execution
 *
 * This file provides a shell session manager that maintains persistent shell processes
 * for executing commands across multiple invocations. It handles cross-platform shell
 * detection and execution, including Windows PowerShell compatibility.
 *
 * The session manager is designed to be reused across multiple command executions,
 * which improves performance by avoiding repeated shell initialization and allows
 * commands to maintain context and state in the shell environment.
 */

import { tool, type ToolSet } from "ai";
import { z } from "zod";
const { spawn } = Bun;

/**
 * Determines the appropriate shell to use based on the operating system.
 *
 * For Windows systems, it first attempts to use PowerShell Core (pwsh) if available,
 * falling back to Windows PowerShell.
 *
 * For POSIX systems (macOS, Linux), it prioritizes zsh, then bash, and finally sh.
 *
 * @returns The name of the shell to use (e.g., "pwsh", "powershell", "zsh", "bash", "sh")
 */
const calculateShell = () => {
  if (process.platform === "win32") {
    if (Bun.which("pwsh")) return "pwsh";
    return "powershell";
  }

  // POSIX preference: zsh -> bash -> sh
  if (Bun.which("zsh")) return "zsh";
  if (Bun.which("bash")) return "bash";
  return "sh";
};

/**
 * Gets the appropriate command-line arguments for a given shell.
 *
 * Different shells require different arguments to properly handle
 * command execution in a persistent session. PowerShell requires
 * specific flags for proper operation.
 *
 * @param shell - The shell name to get arguments for
 * @returns An array of command-line arguments for the specified shell
 */
const getShellArgs = (shell: ReturnType<typeof calculateShell>) => {
  switch (shell) {
    case "powershell":
    case "pwsh":
      return ["-NoLogo", "-NoProfile", "-NoExit", "-Command", "-"];
    default:
      return [];
  }
};

/**
 * Gets shell information with caching to avoid repeated system checks.
 *
 * This function uses a closure to cache the shell name and arguments,
 * preventing repeated expensive operations like shell availability checks.
 * The cached information is returned on subsequent calls.
 *
 * @returns An object containing the shell name and command-line arguments
 */
const getShellInfo = (() => {
  let cachedShellName: ReturnType<typeof calculateShell> | null = null;
  let cacheShellArgs: string[] | null = null;
  return () => {
    cachedShellName ??= calculateShell();
    cacheShellArgs ??= getShellArgs(cachedShellName);

    return {
      shell: cachedShellName,
      args: cacheShellArgs,
    } as const;
  };
})();

export type ShellOptions = {
  shellOverride?: ReturnType<typeof calculateShell>;
};

/**
 * Manages a persistent shell session for executing commands.
 *
 * This class encapsulates the logic for maintaining a long-lived shell process
 * that can execute multiple commands while preserving state and context.
 * It handles process management, command execution, and proper cleanup.
 */
export class ShellSession {
  shellInfo: { shell: string; args: string[] };
  shell: Bun.Subprocess<"pipe", "pipe", "pipe">;

  /**
   * Creates a new ShellSession instance and initializes the shell process.
   *
   * The constructor sets up the shell environment by determining the appropriate
   * shell and arguments, then spawns the actual shell process for command execution.
   * It initializes the internal state needed for persistent command execution.
   *
   * @param options - Optional configuration including shell override for testing
   */
  constructor(options: ShellOptions = {}) {
    this.shellInfo = this.getShellInfoWithOverride(options.shellOverride);
    this.shell = this.spawnShell();
  }

  /**
   * Gets shell information with optional override for testing.
   *
   * @param shellOverride - Optional shell to use instead of auto-detection
   * @returns Shell information with name and arguments
   */
  private getShellInfoWithOverride(shellOverride?: ReturnType<typeof calculateShell>) {
    if (shellOverride) {
      return {
        shell: shellOverride,
        args: getShellArgs(shellOverride),
      } as const;
    }
    return getShellInfo();
  }

  /**
   * Spawns a new shell process with the configured shell and arguments.
   *
   * This method creates a new Bun subprocess that runs the configured shell
   * with appropriate stdin, stdout, and stderr pipes for command execution.
   * The subprocess is configured to allow reading from all streams.
   *
   * @returns A Bun.Subprocess instance representing the spawned shell
   */
  spawnShell() {
    return spawn([this.shellInfo.shell, ...this.shellInfo.args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
  }

  /**
   * Restarts the shell session by killing the current process and creating a new one.
   *
   * This method safely terminates the existing shell process and waits for it to exit
   * before creating a fresh shell session. It handles potential errors during shutdown
   * and ensures the new session is properly initialized for continued command execution.
   *
   * @returns A Promise that resolves when the restart is complete
   */
  async restart() {
    try {
      this.shell.kill();
      await this.shell.exited;
    } catch {
      console.error("Error waiting for shell to exit, spinning up a new one anyway.");
    }

    this.shell = this.spawnShell();
  }

  /**
   * Executes a command in the shell session and returns the result.
   *
   * This method sends a command to the shell process and waits for its output.
   * It handles asynchronous reading of stdout and stderr streams, manages timeouts,
   * and ensures proper cleanup after command execution.
   *
   * The method uses a timer-based approach to handle commands that might not
   * produce immediate output, ensuring reliable command completion detection.
   *
   * @param command - The shell command to execute
   * @returns A Promise resolving with the command's stdout and stderr output
   */
  async exec(command: string) {
    // PowerShell can be slow to start up
    let idleMs = this.shellInfo.shell === "pwsh" || this.shellInfo.shell === "powershell" ? 30000 : 5000;

    return await new Promise<{ stdout: string; stderr: string }>((resolve) => {
      let stdout = "";
      let stderr = "";
      let timer: NodeJS.Timeout | null = null;

      const resetTimer = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(() => {
          void settle();
        }, idleMs);
        idleMs = 500;
      };

      const readStdout = async (abortSignal: AbortSignal) => {
        const stdoutReader = this.shell.stdout.getReader();
        try {
          const aborted = new Promise<{ done: true; value: undefined }>((res) => {
            abortSignal.addEventListener("abort", () => res({ done: true, value: undefined }), { once: true });
          });
          while (true) {
            const { done, value } = await Promise.race([stdoutReader.read(), aborted]);
            if (done) break;
            if (value) {
              stdout += Buffer.from(value).toString();
              resetTimer();
            }
          }
        } finally {
          stdoutReader.releaseLock();
        }
      };

      const readStderr = async (abortSignal: AbortSignal) => {
        const stderrReader = this.shell.stderr.getReader();
        try {
          const aborted = new Promise<{ done: true; value: undefined }>((res) => {
            abortSignal.addEventListener("abort", () => res({ done: true, value: undefined }), { once: true });
          });
          while (true) {
            const { done, value } = await Promise.race([stderrReader.read(), aborted]);
            if (done) break;
            if (value) {
              stderr += Buffer.from(value).toString();
              resetTimer();
            }
          }
        } finally {
          stderrReader.releaseLock();
        }
      };

      // Start async reading of stdout and stderr
      const abortController = new AbortController();
      const readPromises = Promise.allSettled([readStdout(abortController.signal), readStderr(abortController.signal)]);
      const cleanup = () => {
        abortController.abort();
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
      };

      const settle = async () => {
        cleanup();

        await readPromises;

        stdout = stdout.trimEnd();
        stderr = stderr.trimEnd();

        resolve({ stdout, stderr });
      };

      // Start idle timer in case the command produces no output
      resetTimer();

      // Execute the command
      this.shell.stdin.write(`${command}\n`);
    });
  }
}

/**
 * Creates and returns a shell tool with persistent session management.
 *
 * This function creates a single ShellSession instance that is reused across
 * multiple tool invocations to maintain a persistent shell environment.
 * This approach provides better performance by avoiding repeated shell
 * initialization and allows commands to maintain context and state.
 *
 * @param options - Optional configuration including shell override for testing
 * @returns A ToolSet containing the shell tool with persistent session
 */
export const createShellTool = (options: ShellOptions = {}) => {
  // Reuse a single session across calls to maintain a persistent shell
  const session = new ShellSession(options);

  return {
    shell: tool({
      description: `Use this tool to execute a given command in a persistent ${getShellInfo().shell} session on ${process.platform}. 
Use this tool when you need to run commands/binaries, or perform system operations.
The shell session is persistent, so things like directory changes will persist across calls. Restarting the session will reset any state.`,
      inputSchema: ShellInputSchema,
      outputSchema: ShellOutputSchema,
      execute: async ({ command, restart }): Promise<ShellOutput> => {
        if (command === "ls -R" || command === "dir /s") {
          // Prevent potentially dangerous recursive listings
          throw new Error("Please use the find or search tool for recursive searches.");
        }

        if (restart) await session.restart();
        return session.exec(command);
      },
    }),
  } satisfies ToolSet;
};

export const ShellInputSchema = z.object({
  command: z.string().describe("The shell command to execute"),
  restart: z.boolean().optional().describe("Set to true to restart the shell session"),
});

export type ShellInput = z.infer<typeof ShellInputSchema>;

export const ShellOutputSchema = z.object({
  stdout: z.string().describe("The standard output of the command"),
  stderr: z.string().describe("The standard error output of the command"),
});

export type ShellOutput = z.infer<typeof ShellOutputSchema>;

export type ShellToolSet = ReturnType<typeof createShellTool>;
