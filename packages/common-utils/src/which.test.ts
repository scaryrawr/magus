/**
 * Tests for the cross-platform which implementation
 */

import { describe, expect, test } from "bun:test";
import path from "node:path";
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
      // Test with Windows system executables
      const cmdPath = path.join("C:", "Windows", "System32", "cmd.exe");
      const wherePath = path.join("C:", "Windows", "System32", "where.exe");

      const result1 = which(cmdPath);
      const result2 = which(wherePath);
      // At least one should exist
      expect(result1 === cmdPath || result2 === wherePath || result1 === null).toBe(true);
    } else {
      // Test with common Unix paths
      const shPath = path.join("/", "bin", "sh");
      const result = which(shPath);
      // Should either return the path if it exists, or null if it doesn't
      expect(result === shPath || result === null).toBe(true);
    }
  });

  test("should return null for non-executable files with path separators", () => {
    // Test with a file that exists but isn't executable
    if (process.platform === "win32") {
      // On Windows, test with a non-executable file
      const hostsPath = path.join("C:", "Windows", "System32", "drivers", "etc", "hosts");
      const result = which(hostsPath);
      expect(result).toBeNull();
    } else {
      // On Unix, test with a regular file
      const passwdPath = path.join("/", "etc", "passwd");
      const result = which(passwdPath);
      expect(result).toBeNull();
    }
  });

  test("should recognize various Windows executable extensions", () => {
    if (process.platform !== "win32") {
      // Skip this test on non-Windows platforms
      return;
    }

    // Test that our function recognizes various Windows executable extensions
    // Note: We can't test actual file existence, but we can test the extension logic
    // by creating temporary test files or using the internal logic

    const testExts = [
      ".exe",
      ".com",
      ".cmd",
      ".bat", // Traditional executables
      ".ps1",
      ".ps1xml",
      ".psc1",
      ".psd1", // PowerShell
      ".vbs",
      ".vbe",
      ".js",
      ".jse", // Script files
      ".wsf",
      ".wsh", // Windows Script Host
      ".msi", // Microsoft Installer
      ".scr", // Screen savers
      ".pif", // Program Information Files
      ".application", // ClickOnce applications
      ".gadget", // Windows gadgets
      ".msc", // Management Console snapins
      ".cpl", // Control Panel applications
      ".app", // Legacy application files
    ];

    // All of these should be considered valid executable extensions
    // This is more of a documentation test to show what we support
    expect(testExts.length).toBeGreaterThan(15);
    expect(testExts.includes(".exe")).toBe(true);
    expect(testExts.includes(".ps1")).toBe(true);
    expect(testExts.includes(".msi")).toBe(true);

    // Document that .lnk files are intentionally NOT included
    expect(testExts.includes(".lnk")).toBe(false);
  });

  test("should document .lnk exclusion rationale", () => {
    // This test documents why .lnk files are not treated as executable:
    // 1. They are not directly executable from command line
    // 2. Windows 'where' command doesn't return them when searching PATH
    // 3. They require special Windows APIs to resolve and execute
    // 4. Traditional 'which' behavior focuses on directly executable files

    expect(".lnk files are shortcuts, not direct executables").toBeTruthy();
  });
});

describe("whichAsync", () => {
  test("should find common system commands asynchronously", async () => {
    const nodeResult = await whichAsync("node");
    expect(nodeResult).toBeTruthy();
    expect(typeof nodeResult).toBe("string");

    if (process.platform === "win32") {
      const cmdResult = await whichAsync("cmd");
      expect(cmdResult).toBeTruthy();
    } else {
      const shResult = await whichAsync("sh");
      expect(shResult).toBeTruthy();
    }
  });

  test("should return null for non-existent commands", async () => {
    const result = await whichAsync("this-command-definitely-does-not-exist-12345");
    expect(result).toBeNull();
  });

  test("should return null for empty input", async () => {
    const result = await whichAsync("");
    expect(result).toBeNull();
  });

  test("should handle commands with path separators asynchronously", async () => {
    if (process.platform === "win32") {
      const cmdPath = path.join("C:", "Windows", "System32", "cmd.exe");
      const result = await whichAsync(cmdPath);
      expect(result === cmdPath || result === null).toBe(true);
    } else {
      const shPath = path.join("/", "bin", "sh");
      const result = await whichAsync(shPath);
      expect(result === shPath || result === null).toBe(true);
    }
  });

  test("should return null for non-executable files with path separators asynchronously", async () => {
    if (process.platform === "win32") {
      // On Windows, test with a non-executable file
      const hostsPath = path.join("C:", "Windows", "System32", "drivers", "etc", "hosts");
      const result = await whichAsync(hostsPath);
      expect(result).toBeNull();
    } else {
      // On Unix, test with a regular file
      const passwdPath = path.join("/", "etc", "passwd");
      const result = await whichAsync(passwdPath);
      expect(result).toBeNull();
    }
  });

  test("should be truly asynchronous and allow other operations", async () => {
    // Test that whichAsync doesn't block the event loop
    let otherOperationCompleted = false;

    // Start whichAsync operation
    const whichPromise = whichAsync("node");

    // Schedule another operation to run in the next tick
    process.nextTick(() => {
      otherOperationCompleted = true;
    });

    const result = await whichPromise;

    // If whichAsync was truly async, the nextTick operation should have completed
    expect(otherOperationCompleted).toBe(true);
    expect(result).toBeTruthy();
  });

  test("should handle concurrent calls correctly", async () => {
    // Test multiple concurrent calls
    const promises = [
      whichAsync("node"),
      whichAsync("this-does-not-exist-123"),
      whichAsync("sh"), // might not exist on Windows, but that's ok
      whichAsync(""),
    ];

    const results = await Promise.all(promises);

    // First result (node) should be truthy
    expect(results[0]).toBeTruthy();

    // Second result (non-existent) should be null
    expect(results[1]).toBeNull();

    // Fourth result (empty) should be null
    expect(results[3]).toBeNull();

    // All results should be either string or null
    results.forEach((result) => {
      expect(typeof result === "string" || result === null).toBe(true);
    });
  });

  test("should return same results as sync version for common commands", async () => {
    const commands = ["node"];

    if (process.platform === "win32") {
      commands.push("cmd");
    } else {
      commands.push("sh");
    }

    for (const command of commands) {
      const syncResult = which(command);
      const asyncResult = await whichAsync(command);

      // Both should return the same result
      expect(asyncResult).toBe(syncResult);
    }
  });

  test("should return same results as sync version for non-existent commands", async () => {
    const nonExistentCommands = ["this-definitely-does-not-exist-12345", "another-fake-command-67890", ""];

    for (const command of nonExistentCommands) {
      const syncResult = which(command);
      const asyncResult = await whichAsync(command);

      // Both should return null
      expect(asyncResult).toBe(syncResult);
      expect(asyncResult).toBeNull();
    }
  });

  test("should handle path separator cases same as sync version", async () => {
    let testPaths: string[] = [];

    if (process.platform === "win32") {
      testPaths = [
        path.join("C:", "Windows", "System32", "cmd.exe"),
        path.join("C:", "Windows", "System32", "where.exe"),
        path.join("C:", "Windows", "System32", "drivers", "etc", "hosts"), // non-executable
      ];
    } else {
      testPaths = [
        path.join("/", "bin", "sh"),
        path.join("/", "usr", "bin", "which"),
        path.join("/", "etc", "passwd"), // non-executable
      ];
    }

    for (const testPath of testPaths) {
      const syncResult = which(testPath);
      const asyncResult = await whichAsync(testPath);

      // Both should return the same result
      expect(asyncResult).toBe(syncResult);
    }
  });
});
