/**
 * Tests for the cross-platform which implementation
 */

import { describe, expect, test } from "bun:test";
import { which, whichAsync } from "./which";

describe("which", () => {
  test("should find common system commands", () => {
    // Test with commands that should exist on most systems
    const nodeResult = which("node");
    expect(nodeResult).toBeTruthy();
    expect(typeof nodeResult).toBe("string");

    if (process.platform === "win32") {
      const cmdResult = which("cmd");
      expect(cmdResult).toBeTruthy();
    } else {
      const shResult = which("sh");
      expect(shResult).toBeTruthy();
    }
  });

  test("should return null for non-existent commands", () => {
    const result = which("this-command-definitely-does-not-exist-12345");
    expect(result).toBeNull();
  });

  test("should return null for empty input", () => {
    const result = which("");
    expect(result).toBeNull();
  });

  test("should handle commands with path separators", () => {
    // Test with a known executable path
    if (process.platform === "win32") {
      const result = which("C:\\Windows\\System32\\cmd.exe");
      expect(result).toBe("C:\\Windows\\System32\\cmd.exe");
    } else {
      const result = which("/bin/sh");
      // Should either return the path if it exists, or null if it doesn't
      expect(result === "/bin/sh" || result === null).toBe(true);
    }
  });
});

describe("whichAsync", () => {
  test("should find common system commands asynchronously", async () => {
    const nodeResult = await whichAsync("node");
    expect(nodeResult).toBeTruthy();
    expect(typeof nodeResult).toBe("string");
  });

  test("should return null for non-existent commands", async () => {
    const result = await whichAsync("this-command-definitely-does-not-exist-12345");
    expect(result).toBeNull();
  });

  test("should return null for empty input", async () => {
    const result = await whichAsync("");
    expect(result).toBeNull();
  });
});
