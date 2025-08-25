import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

// Mock fs/promises before importing module under test
const mkdirMock = mock(() => {});
const statMock = mock(() => {});
const writeFileMock = mock(() => {});

mock.module("node:fs/promises", () => ({
  default: {
    mkdir: mkdirMock,
    stat: statMock,
    writeFile: writeFileMock,
  },
  mkdir: mkdirMock,
  stat: statMock,
  writeFile: writeFileMock,
}));

type FsSubset = {
  mkdir: (...args: unknown[]) => Promise<void>;
  stat: (...args: unknown[]) => Promise<{ isFile: () => boolean; isDirectory: () => boolean }>;
  writeFile: (...args: unknown[]) => Promise<void>;
};

const fs = (await import("node:fs/promises")).default as unknown as FsSubset;
const { createFileCreateTool } = await import("./create");

const { clearAllMocks } = mock;

describe("create tool", () => {
  const tool = createFileCreateTool();
  const create = tool.create;

  beforeEach(() => {
    clearAllMocks();
  });

  it("writes a new file and ensures parent dirs", async () => {
    // mkdir succeeds, stat throws ENOENT to indicate no file
    spyOn(fs, "mkdir").mockResolvedValue();

    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fs, "stat").mockRejectedValue(enoent);
    spyOn(fs, "writeFile").mockResolvedValue();

    await expect(
      create.execute?.(
        { command: "create", path: "/tmp/project/src/file.txt", content: "hello" },
        { messages: [], toolCallId: "1" },
      ),
    ).resolves.toEqual({});

    expect(mkdirMock).toHaveBeenCalled();
    expect(writeFileMock).toHaveBeenCalled();
  });

  it("throws if file already exists", async () => {
    spyOn(fs, "mkdir").mockResolvedValue();
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => true, isDirectory: () => false });

    await expect(
      create.execute?.(
        { command: "create", path: "/tmp/existing.txt", content: "x" },
        { messages: [], toolCallId: "1" },
      ),
    ).rejects.toThrow("File already exists at the specified path");
  });

  it("throws if a directory exists at path", async () => {
    spyOn(fs, "mkdir").mockResolvedValue();
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => false, isDirectory: () => true });

    await expect(
      create.execute?.({ command: "create", path: "/tmp/some-dir", content: "x" }, { messages: [], toolCallId: "1" }),
    ).rejects.toThrow("A directory exists at the specified path");
  });
});
