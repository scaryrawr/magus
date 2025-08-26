import { tool, type ToolSet } from "ai";
import { spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { z } from "zod";

let cachedShellName: string | null = null;
const shell_name = () => {
  const calculateShell = () => {
    if (process.platform === "win32") {
      try {
        const result = spawnSync("pwsh", ["--version"], { stdio: "ignore" });
        if (result.status === 0) return "pwsh";
      } catch {
        // ignore and fall back to powershell
      }

      return "powershell";
    }
    // POSIX preference: zsh -> bash -> sh
    try {
      const z = spawnSync("zsh", ["--version"], { stdio: "ignore" });
      if (z.status === 0) return "zsh";
    } catch {
      // zsh not available
    }

    try {
      const b = spawnSync("bash", ["--version"], { stdio: "ignore" });
      if (b.status === 0) return "bash";
    } catch {
      // bash not available
    }

    return "sh";
  };

  return (cachedShellName ??= calculateShell());
};

const description = () => {
  return `Executes a given command in a persistent ${shell_name()} session on ${process.platform}.`;
};

class ShellSession {
  shell: ChildProcessWithoutNullStreams;
  constructor() {
    this.shell = spawn(shell_name());
  }

  async restart() {
    return await new Promise<void>((resolve) => {
      this.shell.once("exit", () => {
        this.shell = spawn(shell_name());
        resolve();
      });

      this.shell.kill();
    });
  }

  async exec(command: string) {
    // Windows PowerShell can be slow to start up
    let idleMs = process.platform === "win32" ? 10000 : 50;
    return await new Promise<{ stdout: string; stderr: string }>((resolve) => {
      let stdout = "";
      let stderr = "";
      let timer: NodeJS.Timeout | null = null;

      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        this.shell.stdout.off("data", onStdout);
        this.shell.stderr.off("data", onStderr);
      };

      const settle = () => {
        cleanup();
        resolve({ stdout, stderr });
      };

      const resetTimer = () => {
        if (timer) clearTimeout(timer);
        timer = setTimeout(settle, idleMs);
        idleMs = 50;
      };

      const onStdout = (data: Buffer) => {
        stdout += data.toString();
        resetTimer();
      };

      const onStderr = (data: Buffer) => {
        stderr += data.toString();
        resetTimer();
      };

      this.shell.stdout.on("data", onStdout);
      this.shell.stderr.on("data", onStderr);

      // Start idle timer in case the command produces no output
      resetTimer();

      // Execute the command
      this.shell.stdin.write(`${command}\n`);
    });
  }
}

export const createShellTool = () => {
  // Reuse a single session across calls to maintain a persistent shell
  const session = new ShellSession();

  return {
    shell: tool({
      description: description(),
      inputSchema: z.object({
        command: z.string().describe("The shell command to execute"),
        restart: z.optional(z.boolean()).describe("Set to true to restart the shell session"),
      }),
      outputSchema: z.object({
        stdout: z.string().describe("The standard output of the command"),
        stderr: z.string().describe("The standard error output of the command"),
      }),
      execute: async ({ command, restart }) => {
        if (restart) await session.restart();
        return session.exec(command);
      },
    }),
  } satisfies ToolSet;
};
