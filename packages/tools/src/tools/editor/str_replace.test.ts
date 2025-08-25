import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { resolveToolOutput } from "../../test-utils";

// Mock the filesystem BEFORE importing the module under test
const statMock = mock(() => {});
const readFileMock = mock(() => {});
const writeFileMock = mock(() => {});

mock.module("node:fs/promises", () => ({
  // Provide both default (for default import) and named exports
  default: {
    stat: statMock,
    readFile: readFileMock,
    writeFile: writeFileMock,
  },
  stat: statMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));

// Import after mocking so the implementation receives the mocked module
type FsSubset = {
  stat: (...args: unknown[]) => Promise<{ isFile: () => boolean }>;
  readFile: (...args: unknown[]) => Promise<string>;
  writeFile: (...args: unknown[]) => Promise<void>;
};

const fs = (await import("node:fs/promises")).default as unknown as FsSubset;
const { createStrReplaceTool } = await import("./str_replace");

const { clearAllMocks } = mock;

describe("str_replace tool", () => {
  const tool = createStrReplaceTool();
  const strReplace = tool.str_replace;

  beforeEach(() => {
    clearAllMocks();
  });

  it("should replace a string in a file and return the diff", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fs, "stat").mockResolvedValue(mockStat);
    spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

    spyOn(fs, "writeFile").mockResolvedValue(undefined);

    const result = await strReplace.execute?.(
      {
        command: "str_replace",
        path: "/test/file.ts",
        old_str: 'console.log("Hello, world!");',
        new_str: 'console.log("Hello, Bun!");',
      },
      {
        messages: [],
        toolCallId: "1",
      },
    );

    // Normalize possible AsyncIterable result into a single value
    const resolved = await resolveToolOutput(result as { diff: string } | AsyncIterable<{ diff: string }>);

    expect(resolved.diff).toContain('console.log("Hello, world!");');
    expect(resolved.diff).toContain('console.log("Hello, Bun!");');
  });

  it("should throw an error when old_str and new_str are identical", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fs, "stat").mockResolvedValue(mockStat);
    spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

    await expect(
      strReplace.execute?.(
        {
          command: "str_replace",
          path: "/test/file.ts",
          old_str: 'console.log("Hello, world!");',
          new_str: 'console.log("Hello, world!");',
        },
        {
          messages: [],
          toolCallId: "1",
        },
      ),
    ).rejects.toThrow("No changes made: old_str and new_str are identical.");
  });

  it("should throw an error when the path is not a file", async () => {
    const mockStat: { isFile: () => boolean } = { isFile: () => false };

    spyOn(fs, "stat").mockResolvedValue(mockStat);

    await expect(
      strReplace.execute?.(
        {
          command: "str_replace",
          path: "/test/file.ts",
          old_str: 'console.log("Hello, world!");',
          new_str: 'console.log("Hello, Bun!");',
        },
        {
          messages: [],
          toolCallId: "1",
        },
      ),
    ).rejects.toThrow("Path is not a file");
  });

  it("should throw an error when old_str is not found in the file", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fs, "stat").mockResolvedValue(mockStat);
    spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

    await expect(
      strReplace.execute?.(
        {
          command: "str_replace",
          path: "/test/file.ts",
          old_str: "nonexistent string",
          new_str: 'console.log("Hello, Bun!");',
        },
        {
          messages: [],
          toolCallId: "1",
        },
      ),
    ).rejects.toThrow("The specified old_str was not found in the file.");
  });

  it("should throw an error when old_str appears multiple times", async () => {
    const mockFileContent = `function hello() {
  console.log("Hello, world!");
  console.log("Hello, world!");
  return "hello";
}`;

    const mockStat: { isFile: () => boolean } = { isFile: () => true };

    spyOn(fs, "stat").mockResolvedValue(mockStat);
    spyOn(fs, "readFile").mockResolvedValue(mockFileContent);

    await expect(
      strReplace.execute?.(
        {
          command: "str_replace",
          path: "/test/file.ts",
          old_str: 'console.log("Hello, world!");',
          new_str: 'console.log("Hello, Bun!");',
        },
        {
          messages: [],
          toolCallId: "1",
        },
      ),
    ).rejects.toThrow(
      "The specified old_str appears multiple times in the file. Aborting to avoid unintended broad edits.",
    );
  });
});
