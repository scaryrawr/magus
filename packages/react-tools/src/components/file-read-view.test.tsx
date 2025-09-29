import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import { FileReadView } from "./file-read-view";

describe("FileReadView", () => {
  it("renders a markdown file using the Markdown component", async () => {
    const markdownPath = "/tmp/test.md";
    const markdownContent = "# Hello Universe\n\nThis is a **markdown** file with some content.";

    const { lastFrame } = render(<FileReadView path={markdownPath} content={markdownContent} />);

    const frame = lastFrame();
    expect(frame).toContain(`Read ${markdownPath}`);
    expect(frame).toContain("📖"); // default file icon
    // Should render markdown content, not line numbers since it's markdown
    // Check for line number patterns (digit followed by pipe character)
    expect(frame).not.toMatch(/\d+│/); // No line numbers for markdown
  });

  it("renders a non-markdown file using syntax highlighting with line numbers", async () => {
    const jsPath = "/tmp/test.js";
    const jsContent = "console.log('hello universe');";

    const { lastFrame } = render(<FileReadView path={jsPath} content={jsContent} />);

    const frame = lastFrame();
    expect(frame).toContain(`Read ${jsPath}`);
    expect(frame).toContain("📖"); // default file icon
    expect(frame).toMatch(/1│/); // Should show line numbers for non-markdown (with pipe separator)
  });

  it("handles markdown files with range correctly", async () => {
    const markdownPath = "/tmp/range-test.md";
    // Content should already be filtered for the range - simulating lines 2-4 of a larger file
    const markdownContent = "\n## Line C\n\nContent on line E";
    const range = { start: 2, end: 4 };

    const { lastFrame } = render(<FileReadView path={markdownPath} content={markdownContent} range={range} />);

    const frame = lastFrame();
    expect(frame).toContain(`Read ${markdownPath}`);
    expect(frame).toContain("[2,4]"); // Should show range
    // Should render the provided content as markdown (which is already the ranged content)
    expect(frame).toContain("## Line C");
    expect(frame).not.toContain("# Line A"); // First line should not be included since it's not in the content
  });

  it("handles .markdown extension files correctly", async () => {
    const markdownPath = "/tmp/test.markdown";
    const markdownContent = "# Test Markdown\n\nThis is a test.";

    const { lastFrame } = render(<FileReadView path={markdownPath} content={markdownContent} />);

    const frame = lastFrame();
    expect(frame).toContain(`Read ${markdownPath}`);
    // Should be treated as markdown, so no line numbers
    expect(frame).not.toMatch(/\d+│/); // No line number patterns with pipe
  });

  it("renders typescript files with syntax highlighting and line numbers", async () => {
    const tsPath = "/tmp/test.ts";
    const tsContent = "const x: number = 42;";

    const { lastFrame } = render(<FileReadView path={tsPath} content={tsContent} />);

    const frame = lastFrame();
    expect(frame).toContain(`Read ${tsPath}`);
    expect(frame).toMatch(/1│/); // Should show line numbers for TypeScript
  });
});
