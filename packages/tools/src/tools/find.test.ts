import { describe, expect, it } from "bun:test";
import { existsSync } from "node:fs";
import { findFile, type FindFileOptions } from "./find";

// Detect which underlying tools are actually available on this system so we can
// run the suite against each supported backend using the override.
const supported = ["fd", "rg", "find", "pwsh", "powershell"] as const;
type Supported = (typeof supported)[number];

const isInstalled = (tool: Supported) => {
  try {
    // --version is a safe probe for all candidates; if the command exists,
    // Bun.spawnSync will not throw even if the exit code is non-zero.
    Bun.spawnSync([tool, "--version"]);
    return true;
  } catch {
    return false;
  }
};

const installedTools: Supported[] = supported.filter(isInstalled);

// If none are detected for some reason, fall back to a single auto-detect run so
// the suite still exercises the happy path.
const toolsToTest: FindFileOptions["findToolOverride"][] =
  installedTools.length > 0 ? (installedTools as FindFileOptions["findToolOverride"][]) : [undefined];

for (const override of toolsToTest) {
  const label = override ? `(${override} override)` : "(auto-detect)";
  describe(`find tool ${label}`, () => {
    it("can find known files by glob-like name matching regardless of tool backend", async () => {
      // Readme at repo root should exist
      const readme = await findFile({ pattern: "README.md", path: ".", findToolOverride: override });
      expect(readme.total_matches).toBeGreaterThan(0);
      // Confirm at least one is the actual repo root README
      const hasRootReadme = readme.files.some((f) => f === "./README.md" || f === "README.md" || f === ".\\README.md");
      expect(hasRootReadme).toBeTrue();
    });

    it("finds TypeScript or JSON files under packages without relying on exact counts", async () => {
      const tsResults = await findFile({ pattern: ".ts", path: "packages", findToolOverride: override });
      const jsonResults = await findFile({ pattern: ".json", path: "packages", findToolOverride: override });
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
      const res = await findFile({ pattern: "package.json", path: ".", findToolOverride: override });
      // Should not include entries under node_modules or .git
      const bad = res.files.filter((f) => /(\/|\\)(node_modules|\.git)(\/|\\)/.test(f));
      expect(bad.length).toBe(0);
    });
  });
}
