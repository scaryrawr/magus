import { afterAll, beforeAll, describe, expect, it } from "bun:test";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { basename, join } from "node:path";
import { grepFile } from "./grep";

describe("grep tool", () => {
  let root: string;
  let files: Record<string, string>;

  beforeAll(() => {
    root = mkdtempSync(join(tmpdir(), "magus-grep-"));
    // Create directory structure
    mkdirSync(join(root, "sub", "deep"), { recursive: true });

    files = {
      one: join(root, "one.txt"),
      two: join(root, "two.md"),
      three: join(root, "sub", "three.txt"),
      four: join(root, "sub", "deep", "four.txt"),
    } as const;

    // Controlled contents: one match per line to keep counts deterministic
    writeFileSync(
      files.one,
      [
        "Hello world", // matches (lowercase)
        "No match here",
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      files.two,
      [
        "Just a line",
        "Another World", // uppercase W (no match unless ignore_case)
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      files.three,
      [
        "world start", // matches (lowercase)
        "middle world", // matches (lowercase)
      ].join("\n"),
      "utf8",
    );

    writeFileSync(
      files.four,
      [
        "WORLD upper", // all caps (no match unless ignore_case)
        "none",
      ].join("\n"),
      "utf8",
    );
  });

  afterAll(() => {
    // Cleanup temp directory
    rmSync(root, { recursive: true, force: true });
  });

  it("finds matches recursively in a directory", async () => {
    const res = await grepFile({ pattern: "world", path: root, file_names_only: false, ignore_case: false });

    // Expect only the lowercase lines (3 total) to match in case-sensitive mode
    expect(res.total_matches).toBe(3);
    expect(res.matches.length).toBe(3);
    // Do not depend on exact formatting; assert each reported line contains the pattern case-sensitively
    for (const line of res.matches) {
      expect(line.includes("world")).toBeTrue();
    }
  });

  it("searches a specific file only when given a file path", async () => {
    const res = await grepFile({ pattern: "world", path: files.one, file_names_only: false, ignore_case: false });
    expect(res.total_matches).toBe(1);
    expect(res.matches.length).toBe(1);
    expect(res.matches[0].toLowerCase().includes("world")).toBeTrue();
  });

  it("can return only filenames for matches (unique per file)", async () => {
    const res = await grepFile({ pattern: "world", path: root, file_names_only: true, ignore_case: false });

    // In filename-only mode, we expect just the files containing lowercase "world": one.txt and three.txt
    const names = new Set(res.matches.map((m) => basename(m.trim())));
    expect(names.has("one.txt")).toBeTrue();
    expect(names.has("three.txt")).toBeTrue();
    expect(names.has("two.md")).toBeFalse();
    expect(names.has("four.txt")).toBeFalse();
    // exactly two files should be returned
    expect(names.size).toBe(2);
  });

  it("supports ignore_case to match variants like World/WORLD", async () => {
    const res = await grepFile({ pattern: "world", path: root, file_names_only: false, ignore_case: true });

    // With ignore_case, all four files contribute one or more matching lines:
    // one.txt (1), three.txt (2), two.md (1), four.txt (1) => total 5 lines
    expect(res.total_matches).toBe(5);
    expect(res.matches.length).toBe(5);
    // Lines should contain the word in some case
    for (const line of res.matches) {
      expect(line.toLowerCase().includes("world")).toBeTrue();
    }
  });
});
