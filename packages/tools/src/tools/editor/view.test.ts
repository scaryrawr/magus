import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

// Use real module and spy on methods
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fsmod: any = await import("node:fs/promises");
const { viewFile } = await import("./view");

const { clearAllMocks } = mock;

describe("viewFile", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it("lists directory contents", async () => {
    spyOn(fsmod, "stat").mockResolvedValue({ isFile: () => false, isDirectory: () => true });
    spyOn(fsmod, "readdir").mockResolvedValue(["a.txt", "b.txt"]);

    const result = await viewFile({ path: "/tmp" });
    expect(result.content).toBe("a.txt\nb.txt");
  });

  it("returns full file contents when no range", async () => {
    spyOn(fsmod, "stat").mockResolvedValue({ isFile: () => true, isDirectory: () => false });
    spyOn(fsmod, "readFile").mockResolvedValue("x\ny\nz");

    const result = await viewFile({ path: "/tmp/file.txt" });
    expect(result.content).toBe("x\ny\nz");
  });

  it("returns a subset when range provided", async () => {
    spyOn(fsmod, "stat").mockResolvedValue({ isFile: () => true, isDirectory: () => false });
    spyOn(fsmod, "readFile").mockResolvedValue("1\n2\n3\n4");

    const result = await viewFile({ path: "/tmp/file.txt", view_range: { start: 2, end: 3 } });
    expect(result.content).toBe("2\n3");
  });
});
