import { describe, expect, it } from "bun:test";
import { buildDefaultConfigs, defaultServerDefinitions } from "./defaults"; // does not instantiate LspManager (safe for test)

describe("buildDefaultConfigs", () => {
  it("filters by existing commands and languages", () => {
    const cfgs = buildDefaultConfigs({
      commandExists: (cmd) => ["typescript-language-server", "vscode-eslint-language-server"].includes(cmd),
      includeLanguages: ["typescript"],
    });
    expect(cfgs.length).toBeGreaterThan(0);
    // Should only include ts related servers
    for (const c of cfgs) {
      const langs = new Set(
        c.selector.map((s) => (typeof s === "string" ? s : s.language)).filter((l): l is string => Boolean(l)),
      );
      expect(Array.from(langs)).toContain("typescript");
    }
  });

  it("can skip command existence check and retain all defaults", () => {
    const defs = defaultServerDefinitions();
    const cfgs = buildDefaultConfigs({ skipCommandCheck: true });
    expect(cfgs.length).toBe(defs.length);
  });
});
