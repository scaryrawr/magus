import { describe, expect, it } from "bun:test";
import { __TESTING__, detectLanguage } from "./languages";

const cases: Array<[string, string]> = [
  ["/project/src/file.ts", "typescript"],
  ["/project/src/file.tsx", "typescript"],
  ["/project/src/file.js", "javascript"],
  ["/project/src/file.jsx", "javascript"],
  ["/project/src/file.py", "python"],
  ["/project/src/file.json", "json"],
  ["/project/src/file.yml", "yaml"],
  ["/project/src/file.yaml", "yaml"],
  ["/project/README.md", "markdown"],
  ["/project/docs/guide.markdown", "markdown"],
  ["/project/src/main.rs", "rust"],
  ["/project/src/main.go", "go"],
  ["/project/src/init.lua", "lua"],
  ["/project/scripts/run.sh", "bash"],
  ["/project/scripts/run.bash", "bash"],
  ["/project/styles/site.css", "css"],
  ["/project/public/index.html", "html"],
  ["/project/public/index.htm", "html"],
  ["/project/Dockerfile", "docker"],
  ["/project/backend/Dockerfile.dev", "docker"],
  ["/project/unknown.ext", "plaintext"],
];

describe("detectLanguage", () => {
  for (const [file, expected] of cases) {
    it(`detects ${expected} for ${file}`, () => {
      expect(detectLanguage(file)).toBe(expected);
    });
  }

  it("returns plaintext for no extension", () => {
    expect(detectLanguage("/project/FILE_WITH_NO_EXTENSION")).toBe("plaintext");
  });

  it("prefers longer extension matches (markdown over md)", () => {
    expect(detectLanguage("/project/file.markdown")).toBe("markdown");
  });

  it("is case-insensitive", () => {
    expect(detectLanguage("/project/ReadMe.MD")).toBe("markdown");
  });

  it("exports internal maps for potential extension", () => {
    expect(Object.keys(__TESTING__.EXTENSION_LANGUAGE_MAP).length).toBeGreaterThan(0);
  });
});
