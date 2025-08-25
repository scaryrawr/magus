import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";
import { resolveToolOutput } from "../../test-utils";

// Mock fs/promises before importing module under test
const statMock = mock(() => {});
const readFileMock = mock(() => {});
const readdirMock = mock(() => {});

mock.module("node:fs/promises", () => ({
  default: {
    stat: statMock,
    readFile: readFileMock,
    readdir: readdirMock,
  },
  stat: statMock,
  readFile: readFileMock,
  readdir: readdirMock,
}));

type FsSubset = {
  stat: (...args: unknown[]) => Promise<{ isFile: () => boolean; isDirectory: () => boolean }>;
  readFile: (...args: unknown[]) => Promise<string>;
  readdir: (...args: unknown[]) => Promise<string[]>;
};

const fs = (await import("node:fs/promises")).default as unknown as FsSubset;
const { createViewTool } = await import("./view");

const { clearAllMocks } = mock;

describe("view tool", () => {
  const tool = createViewTool();
  const view = tool.view;

  beforeEach(() => {
    clearAllMocks();
  });

  it("lists directory contents", async () => {
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => false, isDirectory: () => true });
    spyOn(fs, "readdir").mockResolvedValue(["a.txt", "b.txt"]);

    const result = await view.execute?.({ command: "view", path: "/tmp" }, { messages: [], toolCallId: "1" });
    const resolved = await resolveToolOutput(result);
    expect(resolved).toBe("a.txt\nb.txt");
  });

  it("returns full file contents when no range", async () => {
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => true, isDirectory: () => false });
    spyOn(fs, "readFile").mockResolvedValue("x\ny\nz");

    const result = await view.execute?.({ command: "view", path: "/tmp/file.txt" }, { messages: [], toolCallId: "1" });
    const resolved = await resolveToolOutput(result);
    expect(resolved).toBe("x\ny\nz");
  });

  it("returns a subset when range provided", async () => {
    spyOn(fs, "stat").mockResolvedValue({ isFile: () => true, isDirectory: () => false });
    spyOn(fs, "readFile").mockResolvedValue("1\n2\n3\n4");

    const result = await view.execute?.(
      { command: "view", path: "/tmp/file.txt", view_range: [2, 3] },
      { messages: [], toolCallId: "1" },
    );
    const resolved = await resolveToolOutput(result);
    expect(resolved).toBe("2\n3");
  });
});
