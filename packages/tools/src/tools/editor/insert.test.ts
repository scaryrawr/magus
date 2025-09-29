import { beforeEach, describe, expect, it, mock, spyOn } from "bun:test";

// Use real module & spy on methods to avoid module-level mocking conflicts
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const fsmod: any = await import("node:fs/promises");
const { insert } = await import("./insert");

const { clearAllMocks } = mock;

describe("insert", () => {
  beforeEach(() => {
    clearAllMocks();
  });

  it("inserts into existing file and returns diff", async () => {
    const original = "line1\nline2";
    spyOn(fsmod, "stat").mockResolvedValue({ isFile: () => true });
    spyOn(fsmod, "readFile").mockResolvedValue(original);
    spyOn(fsmod, "writeFile").mockResolvedValue();

    const result = await insert({ path: "/tmp/file.txt", line: 1, new_str: "NEW" });
    expect(result.diff).toContain("line1");
    expect(result.diff).toContain("NEW");
    expect(result.diff).toContain("line2");
  });

  it("creates file when missing and insert_line is 0", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fsmod, "stat").mockRejectedValue(enoent);
    spyOn(fsmod, "mkdir").mockImplementation(async () => {});
    spyOn(fsmod, "writeFile").mockResolvedValue();

    const result = await insert({ path: "/tmp/new-file.txt", line: 0, new_str: "hello" });
    expect(typeof result).toBe("object");
  });

  it("throws if file missing and insert_line > 0", async () => {
    const enoent = Object.assign(new Error("not found"), { code: "ENOENT" });
    spyOn(fsmod, "stat").mockRejectedValue(enoent);

    await expect(insert({ path: "/tmp/missing.txt", line: 2, new_str: "x" })).rejects.toThrow("File not found");
  });

  it("throws if path is not file", async () => {
    spyOn(fsmod, "stat").mockResolvedValue({ isFile: () => false });

    await expect(insert({ path: "/tmp/some-dir", line: 0, new_str: "x" })).rejects.toThrow("Path is not a file");
  });
});
