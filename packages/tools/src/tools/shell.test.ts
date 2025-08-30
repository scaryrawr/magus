import { describe, expect, it } from "bun:test";
import stripAnsi from "strip-ansi";
import { ShellSession, type ShellOptions } from "./shell";

// Detect which shells are actually available on this system so we can
// run the suite against each supported backend using the override.
const supported = ["pwsh", "powershell", "zsh", "bash", "sh"] as const;
type Supported = (typeof supported)[number];

const isInstalled = (shell: Supported) => {
  try {
    // --version is a safe probe for most shells; if the command exists,
    // Bun.spawnSync will not throw even if the exit code is non-zero.
    if (shell === "sh") {
      // sh doesn't support --version, use a different approach
      Bun.spawnSync([shell, "-c", "echo test"]);
    } else {
      Bun.spawnSync([shell, "--version"]);
    }
    return true;
  } catch {
    return false;
  }
};

const installedShells: Supported[] = supported.filter(isInstalled);

// If none are detected for some reason, fall back to a single auto-detect run so
// the suite still exercises the happy path.
const shellsToTest: ShellOptions["shellOverride"][] =
  installedShells.length > 0 ? (installedShells as ShellOptions["shellOverride"][]) : [undefined];

for (const override of shellsToTest) {
  const label = override ? `(${override} override)` : "(auto-detect)";
  describe(`ShellSession ${label}`, () => {
    it("executes a command and captures stdout", async () => {
      const session = new ShellSession({ shellOverride: override });
      try {
        const res = await session.exec("echo 'hello world'");
        expect(res.stdout).toContain("hello world");
      } finally {
        session.shell.kill();
      }
    });

    it("captures stderr output", async () => {
      const session = new ShellSession({ shellOverride: override });
      try {
        const shell = session.shellInfo.shell;
        const cmd =
          shell === "powershell" || shell === "pwsh" ? "[Console]::Error.WriteLine('oops')" : "echo oops 1>&2";
        const res = await session.exec(cmd);
        expect(res.stderr).toContain("oops");
      } finally {
        session.shell.kill();
      }
    });

    it("restart() creates a new underlying shell process", async () => {
      const session = new ShellSession({ shellOverride: override });
      try {
        const shell = session.shellInfo.shell;
        const pidCmd = shell === "powershell" || shell === "pwsh" ? 'echo "$PID"' : 'echo "$$"';

        const first = await session.exec(pidCmd);
        const pid1Line = stripAnsi(first.stdout);
        const pid1 = Number(pid1Line);
        expect(Number.isFinite(pid1)).toBeTrue();

        await session.restart();

        const second = await session.exec(pidCmd);
        const pid2Line = stripAnsi(second.stdout);
        const pid2 = Number(pid2Line);
        expect(Number.isFinite(pid2)).toBeTrue();
        expect(pid2).not.toBe(pid1);

        // sanity: session still works post-restart
        const res = await session.exec("echo ok");
        expect(res.stdout).toContain("ok");
      } finally {
        session.shell.kill();
      }
    });
  });
}
