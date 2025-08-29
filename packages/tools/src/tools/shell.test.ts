import { describe, expect, it } from "bun:test";
import { ShellSession } from "./shell";

const lines = (s: string) =>
  s
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

describe("ShellSession", () => {
  it("executes a command and captures stdout", async () => {
    const session = new ShellSession();
    try {
      const res = await session.exec("echo 'hello world'");
      expect(lines(res.stdout)).toContain("hello world");
    } finally {
      session.shell.kill();
    }
  });

  it("captures stderr output", async () => {
    const session = new ShellSession();
    try {
      const shell = session.shellInfo.shell;
      const cmd = shell === "powershell" || shell === "pwsh" ? "[Console]::Error.WriteLine('oops')" : "echo oops 1>&2";
      const res = await session.exec(cmd);
      expect(lines(res.stderr)).toContain("oops");
    } finally {
      session.shell.kill();
    }
  });

  it("restart() creates a new underlying shell process", async () => {
    const session = new ShellSession();
    try {
      const shell = session.shellInfo.shell;
      const pidCmd = shell === "powershell" || shell === "pwsh" ? "echo $PID" : "echo $$";

      const first = await session.exec(pidCmd);
      const pid1Line = lines(first.stdout)[0];
      const pid1 = Number(pid1Line);
      expect(Number.isFinite(pid1)).toBeTrue();

      await session.restart();

      const second = await session.exec(pidCmd);
      const pid2Line = lines(second.stdout)[0];
      const pid2 = Number(pid2Line);
      expect(Number.isFinite(pid2)).toBeTrue();
      expect(pid2).not.toBe(pid1);

      // sanity: session still works post-restart
      const res = await session.exec("echo ok");
      expect(lines(res.stdout)).toContain("ok");
    } finally {
      session.shell.kill();
    }
  });
});
