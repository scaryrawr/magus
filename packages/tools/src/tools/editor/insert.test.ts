import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { resolveToolOutput } from "../../test-utils";

// Mock fs/promises before importing module under test
const mkdirMock = mock(() => {});
const statMock = mock(() => {});
const readFileMock = mock(() => {});
const writeFileMock = mock(() => {});

mock.module("node:fs/promises", () => ({
  default: {
    mkdir: mkdirMock,
    stat: statMock,
    readFile: readFileMock,
    writeFile: writeFileMock,
  },
  mkdir: mkdirMock,
  stat: statMock,
  readFile: readFileMock,
  writeFile: writeFileMock,
}));

type FsSubset = {
  mkdir: (...args: unknown[]) => Promise<void>;
  stat: (...args: unknown[]) => Promise<{ isFile: () => boolean }>;
  readFile: (...args: unknown[]) => Promise<string>;
  writeFile: (...args: unknown[]) => Promise<void>;
};

const fs = (await import("node:fs/promises")).default as unknown as FsSubset;
const { createInsertTool } = await import("./insert");

const { clearAllMocks } = mock;

describe("insert tool", () => {
  const tool = createInsertTool();
  const insert = tool.create; // key is `create` per implementation

  beforeEach(() => {
    clearAllMocks();
  });

  it("inserts into existing file and returns diff", async () => {
    const original = "line1\nline2";
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => true });
    spyOn(fs, "readFile").mockResolvedValue(original);
    spyOn(fs, "writeFile").mockResolvedValue();

    const result = await insert.execute?.(
      { command: "insert", path: "/tmp/file.txt", insert_line: 1, new_str: "NEW" },
      { messages: [], toolCallId: "1" },
    );

    const resolved = await resolveToolOutput(result);
    expect(resolved?.diff).toContain("line1");
    expect(resolved?.diff).toContain("NEW");
    expect(resolved?.diff).toContain("line2");
  });

  it("creates file when missing and insert_line is 0", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fs, "stat").mockRejectedValue(enoent);
    spyOn(fs, "mkdir").mockResolvedValue();
    spyOn(fs, "writeFile").mockResolvedValue();

    const result = await insert.execute?.(
      { command: "insert", path: "/tmp/new-file.txt", insert_line: 0, new_str: "hello" },
      { messages: [], toolCallId: "1" },
    );
    const resolved = await resolveToolOutput(result);
    expect(typeof resolved?.diff).toBe("string");
  });

  it("throws if file missing and insert_line > 0", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fs, "stat").mockRejectedValue(enoent);

    await expect(
      insert.execute?.(
        { command: "insert", path: "/tmp/missing.txt", insert_line: 2, new_str: "x" },
        { messages: [], toolCallId: "1" },
      ),
    ).rejects.toThrow("File not found");
  });

  it("throws if path is not file", async () => {
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => false });

    await expect(
      insert.execute?.(
        { command: "insert", path: "/tmp/some-dir", insert_line: 0, new_str: "x" },
        { messages: [], toolCallId: "1" },
      ),
    ).rejects.toThrow("Path is not a file");
  });
});
