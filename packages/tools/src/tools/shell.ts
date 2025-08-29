import { tool, type ToolSet } from "ai";
import { z } from "zod";
const { spawnSync, spawn } = Bun;

const calculateShell = () => {
  if (process.platform === "win32") {
    try {
      spawnSync(["pwsh", "--version"]);
      return "pwsh";
    } catch {
      // ignore and fall back to powershell
    }

    return "powershell";
  }

  // POSIX preference: zsh -> bash -> sh
  try {
    spawnSync(["zsh", "--version"]);
    return "zsh";
  } catch {
    // zsh not available
  }

  try {
    spawnSync(["bash", "--version"]);
    return "bash";
  } catch {
    // bash not available
  }

  return "sh";
};

const getShellArgs = (shell: ReturnType<typeof calculateShell>) => {
  switch (shell) {
    case "powershell":
    case "pwsh":
      return ["-NoLogo", "-NoProfile", "-NoExit", "-Command", "-"];
    default:
      return [];
  }
};

const getShellInfo = (() => {
  let cachedShellName: ReturnType<typeof calculateShell> | null = null;
  let cacheShellArgs: string[] | null = null;
  return () => {
    cachedShellName ??= calculateShell();
    cacheShellArgs ??= getShellArgs(cachedShellName);

    return {
      shell: cachedShellName,
      args: cacheShellArgs,
    };
  };
})();

const description = () => {
  return `Executes a given command in a persistent ${getShellInfo().shell} session on ${process.platform}.`;
};

export class ShellSession {
  shellInfo: { shell: string; args: string[] };
  shell: Bun.Subprocess<"pipe", "pipe", "pipe">;
  constructor() {
    this.shellInfo = getShellInfo();
    this.shell = this.spawnShell();
  }

  spawnShell() {
    return spawn([this.shellInfo.shell, ...this.shellInfo.args], {
      stdin: "pipe",
      stdout: "pipe",
      stderr: "pipe",
    });
  }

  async restart() {
    return await new Promise<void>((resolve, reject) => {
      this.shell.kill();
      this.shell.exited
        .then(() => {
          this.shell = this.spawnShell();
          resolve();
        })
        .catch(reject);
    });
  }

  async exec(command: string) {
    // Windows PowerShell can be slow to start up
    let idleMs = process.platform === "win32" ? 10000 : 200;
    return await new Promise<{ stdout: string; stderr: string }>((resolve) => {
      let stdout = "";
      let stderr = "";
      let timer: NodeJS.Timeout | null = null;

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

      const stdoutReader = this.shell.stdout.getReader();
      const stderrReader = this.shell.stderr.getReader();

      const readStdout = async () => {
        while (true) {
          try {
            const { done, value } = await stdoutReader.read();
            if (done) break;
            if (value) onStdout(Buffer.from(value));
          } catch {
            // aborted
            break;
          }
        }
      };

      const readStderr = async () => {
        while (true) {
          try {
            const { done, value } = await stderrReader.read();
            if (done) break;
            if (value) onStderr(Buffer.from(value));
          } catch {
            // aborted
            break;
          }
        }
      };

      const abortController = new AbortController();

      // Start async reading of stdout and stderr
      void Promise.all([readStdout(), readStderr()]);
      const cleanup = () => {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }

        abortController.abort();
        try {
          stdoutReader.releaseLock();
        } catch {
          /* ignore */
        }
        try {
          stderrReader.releaseLock();
        } catch {
          /* ignore */
        }
      };

      const settle = () => {
        cleanup();
        resolve({ stdout: stdout.trimEnd(), stderr: stderr.trimEnd() });
      };

      // Start idle timer in case the command produces no output
      resetTimer();

      // Execute the command
      this.shell.stdin.write(`${command}\n`);
    });
  }
}

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

export const createShellTool = () => {
  // Reuse a single session across calls to maintain a persistent shell
  const session = new ShellSession();

  return {
    shell: tool({
      description: description(),
      inputSchema: ShellInputSchema,
      outputSchema: ShellOutputSchema,
      execute: async ({ command, restart }): Promise<ShellOutput> => {
        if (restart) await session.restart();
        return session.exec(command);
      },
    }),
  } satisfies ToolSet;
};
