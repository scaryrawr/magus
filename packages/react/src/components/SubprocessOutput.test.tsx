import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import { SubprocessOutput } from "./SubprocessOutput";

async function waitFor(predicate: () => boolean, { timeout = 2000, interval = 20 } = {}) {
  const start = Date.now();
  // quick microtask yield to let Ink mount effects
  await Promise.resolve();
  while (Date.now() - start < timeout) {
    if (predicate()) return;
    await new Promise((r) => setTimeout(r, interval));
  }
  throw new Error("Timed out waiting for condition");
}

describe("SubprocessOutput", () => {
  it("renders stdout from process fed via stdin (cat)", async () => {
    const input = "Hello from stdin";
    const { lastFrame, unmount } = render(<SubprocessOutput command="cat">{input}</SubprocessOutput>);

    await waitFor(() => (lastFrame() ?? "").includes(input));
    expect(lastFrame()).toContain(input);

    unmount();
  });

  it("passes args to the command and renders output (echo)", async () => {
    const msg = "'Echo with args works'";
    const { lastFrame, unmount } = render(
      <SubprocessOutput command="echo" args={[msg]}>
        {undefined}
      </SubprocessOutput>,
    );

    await waitFor(() => (lastFrame() ?? "").includes(msg));
    expect(lastFrame()).toContain(msg);

    unmount();
  });

  it("renders ANSI-colored text content from subprocess as visible text", async () => {
    // Provide ANSI codes via stdin; component parses and re-applies styles using Ink <Text> props
    // so lastFrame should contain the plain text parts regardless of styling codes.
    const colored = "plain \u001b[31mred\u001b[0m done"; // ESC[31m = red
    const { lastFrame, unmount } = render(<SubprocessOutput command="cat">{colored}</SubprocessOutput>);

    await waitFor(() => {
      const f = lastFrame() ?? "";
      return f.includes("plain") && f.includes("red") && f.includes("done");
    });

    const frame = lastFrame() ?? "";
    expect(frame).toContain("plain");
    expect(frame).toContain("red");
    expect(frame).toContain("done");

    unmount();
  });
});
