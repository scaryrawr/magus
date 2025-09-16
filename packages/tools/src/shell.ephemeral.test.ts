import { describe, expect, it } from "bun:test";
import { createShellTool } from "./tools";

describe("ephemeral shell tool", () => {
  const { shell } = createShellTool({ mode: "ephemeral" });

  it("runs a simple command", async () => {
    const result = (await shell.execute?.(
      { command: "echo ephemeral" },
      { messages: [], toolCallId: "test-1" },
    )) as unknown as {
      stdout: string;
      stderr: string;
    };
    expect(result.stdout.trim()).toBe("ephemeral");
  });

  it("does not persist state between calls (directory)", async () => {
    const first = await shell.execute?.(
      { command: "mkdir -p tmp_ephemeral_test && cd tmp_ephemeral_test && pwd" },
      { messages: [], toolCallId: "test-2" },
    );

    const second = (await shell.execute?.({ command: "pwd" }, { messages: [], toolCallId: "test-3" })) as unknown as {
      stdout: string;
      stderr: string;
    };
    const firstCast = first as unknown as { stdout: string; stderr: string };
    expect(firstCast.stdout.trim()).not.toBe(second.stdout.trim());
  });
});
