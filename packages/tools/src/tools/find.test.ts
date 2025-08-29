import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { findFile } from "./find";

describe("find tool", () => {
  it("finds top-level workspace folders like apps and packages", async () => {
    const res = await findFile({ pattern: "apps", path: "." });
    // Should find at least something and include the top-level apps directory entry or children
    expect(res.total_matches).toBeGreaterThan(0);
    const hasAppsDir = res.files.some((f) => /(^|\/)apps(\/|$)/.test(f));
    expect(hasAppsDir).toBeTrue();

    const resPkgs = await findFile({ pattern: "packages", path: "." });
    expect(resPkgs.total_matches).toBeGreaterThan(0);
    const hasPackagesDir = resPkgs.files.some((f) => /(^|\/)packages(\/|$)/.test(f));
    expect(hasPackagesDir).toBeTrue();
  });

  it("can find known files by glob-like name matching regardless of tool backend", async () => {
    // Readme at repo root should exist
    const readme = await findFile({ pattern: "README.md", path: "." });
    expect(readme.total_matches).toBeGreaterThan(0);
    // Confirm at least one is the actual repo root README
    const hasRootReadme = readme.files.some((f) => f === "./README.md" || f === "README.md");
    expect(hasRootReadme).toBeTrue();
  });

  it("finds TypeScript or JSON files under packages without relying on exact counts", async () => {
    const tsResults = await findFile({ pattern: ".ts", path: "packages" });
    const jsonResults = await findFile({ pattern: ".json", path: "packages" });
    // We expect some .ts and .json files in packages/**
    expect(tsResults.total_matches).toBeGreaterThan(0);
    expect(jsonResults.total_matches).toBeGreaterThan(0);
    // sanity: returned paths look like files that exist
    const some = [...tsResults.files.slice(0, 3), ...jsonResults.files.slice(0, 3)];
    for (const p of some) {
      // The implementation normalizes by replacing cwd with "."; make sure existsSync works with normalized or raw
      const candidate = p.startsWith("./") ? p.slice(2) : p;
      expect(existsSync(candidate)).toBeTrue();
    }
  });

  it("ignores typical vendor directories like node_modules and .git", async () => {
    const res = await findFile({ pattern: "package.json", path: "." });
    // Should not include entries under node_modules or .git
    const bad = res.files.filter((f) => /(\/|\\)(node_modules|\.git)(\/|\\)/.test(f));
    expect(bad.length).toBe(0);
  });
});
