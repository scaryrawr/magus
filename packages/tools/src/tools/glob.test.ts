import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { globFile, type GlobFileOptions } from "./glob";

// Detect which underlying tools are actually available on this system so we can
// run the suite against each supported backend using the override.
const supported = ["fd", "rg", "find", "pwsh", "powershell"] as const;
type Supported = (typeof supported)[number];

const isInstalled = (tool: Supported) => {
  return !!Bun.which(tool);
};

const installedTools: Supported[] = supported
  .filter(isInstalled)
  .filter((t) => !(process.platform === "win32" && t === "find"));

// If none are detected for some reason, fall back to a single auto-detect run so
// the suite still exercises the happy path.
const toolsToTest: GlobFileOptions["findToolOverride"][] =
  installedTools.length > 0 ? (installedTools as GlobFileOptions["findToolOverride"][]) : [undefined];

for (const override of toolsToTest) {
  const label = override ? `(${override} override)` : "(auto-detect)";
  describe(`glob tool ${label}`, () => {
    it("can find known files by glob-like name matching regardless of tool backend", async () => {
      // Readme at repo root should exist. On some backends (rg), our implementation lists files
      // without shell quoting, so pattern handling differs. For rg, list all files and filter here.
      const res = await globFile({
        pattern: "README.md",
        path: ".",
        findToolOverride: override,
      });
      expect(res.total_matches).toBeGreaterThan(0);
      // Confirm at least one is the actual repo root README
      const hasRootReadme = res.files.some((f) => f === "./README.md" || f === "README.md" || f === ".\\README.md");
      expect(hasRootReadme).toBeTrue();
    });

    it("finds TypeScript or JSON files under packages without relying on exact counts", async () => {
      // For rg, list all and filter in test due to --iglob quoting differences under spawn.
      const tsResults = await globFile({
        pattern: ".ts",
        path: "packages",
        findToolOverride: override,
      });
      const jsonResults = await globFile({
        pattern: ".json",
        path: "packages",
        findToolOverride: override,
      });
      // We expect some .ts and .json files in packages/**
      const tsFiles = override === "rg" ? tsResults.files.filter((f) => f.endsWith(".ts")) : tsResults.files;
      const jsonFiles = override === "rg" ? jsonResults.files.filter((f) => f.endsWith(".json")) : jsonResults.files;
      expect(tsFiles.length).toBeGreaterThan(0);
      expect(jsonFiles.length).toBeGreaterThan(0);
      // sanity: returned paths look like files that exist
      const some = [...tsFiles.slice(0, 3), ...jsonFiles.slice(0, 3)];
      for (const p of some) {
        // The implementation normalizes by replacing cwd with "."; make sure existsSync works with normalized or raw
        const candidate = p.startsWith("./") ? p.slice(2) : p;
        expect(existsSync(candidate)).toBeTrue();
      }
    });

    it("ignores typical vendor directories like node_modules and .git", async () => {
      const res = await globFile({ pattern: "package.json", path: ".", findToolOverride: override });
      // Should not include entries under node_modules or .git
      const bad = res.files.filter((f) => /(\/|\\)(node_modules|\.git)(\/|\\)/.test(f));
      expect(bad.length).toBe(0);
    });

    it("treats '*' as match-all and includes README.md", async () => {
      const res = await globFile({ pattern: "*", path: ".", findToolOverride: override });
      expect(res.total_matches).toBeGreaterThan(0);
      // Should include the repo README
      const hasReadme = res.files.some(
        (f) => f === "./README.md" || f === "README.md" || /(^|[/\\])README\.md$/.test(f),
      );
      expect(hasReadme).toBeTrue();
      // Should not include vendor directories
      const bad = res.files.filter((f) => /(\/|\\)(node_modules|\.git)(\/|\\)/.test(f));
      expect(bad.length).toBe(0);
      // Sample a few entries and ensure they exist
      for (const p of res.files.slice(0, 3)) {
        const candidate = p.startsWith("./") ? p.slice(2) : p;
        expect(existsSync(candidate)).toBeTrue();
      }
    });

    it("handles '.' as a broad pattern and includes README.md", async () => {
      const res = await globFile({ pattern: ".", path: ".", findToolOverride: override });
      expect(res.total_matches).toBeGreaterThan(0);
      const hasReadme = res.files.some(
        (f) => f === "./README.md" || f === "README.md" || /(^|[/\\])README\.md$/.test(f),
      );
      expect(hasReadme).toBeTrue();
      const bad = res.files.filter((f) => /(\/|\\)(node_modules|\.git)(\/|\\)/.test(f));
      expect(bad.length).toBe(0);
      for (const p of res.files.slice(0, 3)) {
        const candidate = p.startsWith("./") ? p.slice(2) : p;
        expect(existsSync(candidate)).toBeTrue();
      }
    });

    it("respects .gitignore patterns in an arbitrary directory", async () => {
      // Create an isolated temp workspace with its own .gitignore
      const { mkdtempSync, writeFileSync, mkdirSync, rmSync } = await import("node:fs");
      const { tmpdir } = await import("node:os");
      const { join } = await import("node:path");

      const tmpRoot = mkdtempSync(join(tmpdir(), "magus-find-"));
      try {
        // .gitignore ignores a directory and a file pattern
        writeFileSync(join(tmpRoot, ".gitignore"), ["ignored-dir", "*.log"].join("\n"), "utf8");
        mkdirSync(join(tmpRoot, "ignored-dir"));
        writeFileSync(join(tmpRoot, "keep.txt"), "hello", "utf8");
        writeFileSync(join(tmpRoot, "debug.log"), "log should be ignored", "utf8");
        writeFileSync(join(tmpRoot, "ignored-dir", "secret.txt"), "top secret", "utf8");
        mkdirSync(join(tmpRoot, "sub"));
        writeFileSync(join(tmpRoot, "sub", "inner.txt"), "inner", "utf8");

        // Search for .txt files; should NOT surface secret.txt inside ignored-dir
        const resTxt = await globFile({ pattern: ".txt", path: tmpRoot, findToolOverride: override });
        const joined = resTxt.files.join("\n");
        expect(joined.includes("secret.txt")).toBeFalse();
        // Should include at least one of the kept txt files
        expect(resTxt.files.some((f) => f.endsWith("keep.txt") || f.endsWith("inner.txt"))).toBeTrue();

        // Search for .log files; debug.log should be filtered out entirely
        const resLog = await globFile({ pattern: ".log", path: tmpRoot, findToolOverride: override });
        expect(resLog.total_matches).toBe(0);
      } finally {
        rmSync(tmpRoot, { recursive: true, force: true });
      }
    });
  });
}
