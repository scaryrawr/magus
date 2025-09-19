import { describe, expect, it } from "bun:test";
import { render } from "ink-testing-library";
import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import { ReadView } from "./editor-views";

describe("ReadView", () => {
  it("renders a file without crashing and shows numbered lines", async () => {
    const filePath = path.resolve(__dirname, "editor-views.tsx");
    const content = await readFile(filePath, "utf8");

    const { lastFrame } = render(<ReadView path={filePath} content={content} />);

    const frame = lastFrame();
    expect(frame).toContain(`Read ${filePath}`);
    expect(frame).toContain("📖"); // default file icon
  });

  it("renders a directory without crashing and does not show file line numbers", async () => {
    const dirPath = path.resolve(__dirname); // components directory
    const entries = await readdir(dirPath);
    const listing = entries.join("\n");

    const { lastFrame } = render(<ReadView path={dirPath} content={listing} />);

    const frame = lastFrame();
    expect(frame).toContain(`Dir ${dirPath}`);
    expect(frame).toContain("📁"); // default directory icon
    expect(frame).not.toContain(`Read ${dirPath}`); // ensure directory branch used
  });
});
