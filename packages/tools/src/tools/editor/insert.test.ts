import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

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
const { insert } = await import("./insert");

const { clearAllMocks } = mock;

describe("insert", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it("inserts into existing file and returns diff", async () => {
    const original = "line1\nline2";
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => true });
    spyOn(fs, "readFile").mockResolvedValue(original);
    spyOn(fs, "writeFile").mockResolvedValue();

    const result = await insert({ path: "/tmp/file.txt", insert_line: 1, new_str: "NEW" });
    expect(result.diff).toContain("line1");
    expect(result.diff).toContain("NEW");
    expect(result.diff).toContain("line2");
  });

  it("creates file when missing and insert_line is 0", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fs, "stat").mockRejectedValue(enoent);
    spyOn(fs, "mkdir").mockResolvedValue();
    spyOn(fs, "writeFile").mockResolvedValue();

    const result = await insert({ path: "/tmp/new-file.txt", insert_line: 0, new_str: "hello" });
    expect(typeof result.diff).toBe("string");
  });

  it("throws if file missing and insert_line > 0", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fs, "stat").mockRejectedValue(enoent);

    await expect(insert({ path: "/tmp/missing.txt", insert_line: 2, new_str: "x" })).rejects.toThrow("File not found");
  });

  it("throws if path is not file", async () => {
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => false });

    await expect(insert({ path: "/tmp/some-dir", insert_line: 0, new_str: "x" })).rejects.toThrow("Path is not a file");
  });
});
