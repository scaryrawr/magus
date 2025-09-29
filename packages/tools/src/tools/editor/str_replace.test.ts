import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

// Use real module & spy on functions
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fsmod: any = await import("node:fs/promises");
const { stringReplace } = await import("./str_replace");

const { clearAllMocks } = mock;

describe("stringReplace", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it("should replace a string in a file and return the diff", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fsmod, "stat").mockResolvedValue(mockStat);
    spyOn(fsmod, "readFile").mockResolvedValue(mockFileContent);
    spyOn(fsmod, "writeFile").mockResolvedValue(undefined);

    const result = await stringReplace({
      path: "/test/file.ts",
      old_str: 'console.log("Hello, world!");',
      new_str: 'console.log("Hello, Bun!");',
    });

    expect(result.diff).toContain('console.log("Hello, world!");');
    expect(result.diff).toContain('console.log("Hello, Bun!");');
  });

  it("should throw an error when old_str and new_str are identical", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fsmod, "stat").mockResolvedValue(mockStat);
    spyOn(fsmod, "readFile").mockResolvedValue(mockFileContent);

    await expect(
      stringReplace({
        path: "/test/file.ts",
        old_str: 'console.log("Hello, world!");',
        new_str: 'console.log("Hello, world!");',
      }),
    ).rejects.toThrow("No changes made: old_str and new_str are identical.");
  });

  it("should throw an error when the path is not a file", async () => {
    const mockStat: { isFile: () => boolean } = { isFile: () => false };

    spyOn(fsmod, "stat").mockResolvedValue(mockStat);

    await expect(
      stringReplace({
        path: "/test/file.ts",
        old_str: 'console.log("Hello, world!");',
        new_str: 'console.log("Hello, Bun!");',
      }),
    ).rejects.toThrow("Path is not a file");
  });

  it("should throw an error when old_str is not found in the file", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fsmod, "stat").mockResolvedValue(mockStat);
    spyOn(fsmod, "readFile").mockResolvedValue(mockFileContent);

    await expect(
      stringReplace({
        path: "/test/file.ts",
        old_str: "nonexistent string",
        new_str: 'console.log("Hello, Bun!");',
      }),
    ).rejects.toThrow("No changes made: old_str was not found in the file.");
  });

  it("replaces only the first occurrence when old_str appears multiple times", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fsmod, "stat").mockResolvedValue(mockStat);
    spyOn(fsmod, "readFile").mockResolvedValue(mockFileContent);
    // write operation
    spyOn(fsmod, "writeFile").mockResolvedValue(undefined);

    const result = await stringReplace({
      path: "/test/file.ts",
      old_str: 'console.log("Hello, world!");',
      new_str: 'console.log("Hello, Bun!");',
    });

    // Expect diff to include exactly one replacement occurrence
    const oldCount = (result.diff.match(/console\.log\("Hello, world!"\);/g) || []).length;
    const newCount = (result.diff.match(/console\.log\("Hello, Bun!"\);/g) || []).length;
    expect(oldCount).toBeGreaterThan(0);
    expect(newCount).toBeGreaterThan(0);
  });
});
