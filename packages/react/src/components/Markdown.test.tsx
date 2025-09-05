import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import { Markdown } from "./Markdown";

// Basic ANSI SGR stripper without embedding control characters
import { Box } from "ink";
import { parseAnsiToSegments } from "../utils/ansi";

const visibleText = (s: string) =>
  parseAnsiToSegments(s)
    .map((seg) => seg.text)
    .join("");
const maxLineLength = (s: string) =>
  s
    .split("\n")
    .map((l) => l.replace(/\s+$/g, ""))
    .reduce((m, l) => Math.max(m, l.length), 0);

describe("Markdown", () => {
  it("reflows paragraph text to the provided width", async () => {
    const md = `# Title\n\nThis is a long paragraph of text that should reflow based on the width option so that no single line exceeds that width.`;
    const width = 40;
    const { lastFrame } = render(
      <Box width={width}>
        <Markdown>{md}</Markdown>
      </Box>,
    );
    await new Promise((r) => setTimeout(r, 20));
    const out = visibleText(lastFrame() ?? "");
    // Allow some slack for heading underline/etc, but core content should respect width
    expect(maxLineLength(out)).toBeLessThanOrEqual(width);
  });

  it("wraps table cells when width is small", async () => {
    const md = `
| Col A | Col B | Col C |
| ----- | ----- | ----- |
| This is a long cell that should wrap nicely | Another longish bit of content | Short |
`;
    const width = 30; // very narrow terminal
    const { lastFrame } = render(
      <Box width={width}>
        <Markdown>{md}</Markdown>
      </Box>,
    );
    await new Promise((r) => setTimeout(r, 20));
    const out = visibleText(lastFrame() ?? "");
    // No line should exceed width
    expect(maxLineLength(out)).toBeLessThanOrEqual(width);
    // Expect multiple lines due to wrapping
    expect(out.split("\n").length).toBeGreaterThan(4);
  });
});
