import { existsSync } from "node:fs";
import path from "node:path";

/**
 * Detect project languages using presence of marker files.
 * Mirrors previous logic from LspManager.detectProjectLanguages.
 * Returns a Set of language ids used for heuristic prewarm.
 */
export function detectProjectLanguages(
  rootDir: string,
  existsRel: (relPath: string) => boolean = (rel) => existsSync(path.join(rootDir, rel)),
): Set<string> {
  const langs = new Set<string>();

  if (existsRel("package.json")) {
    langs.add("javascript");
    langs.add("typescript");
    langs.add("json");
  }
  if (existsRel("tsconfig.json")) langs.add("typescript");
  if (existsRel("Cargo.toml")) langs.add("rust");
  if (existsRel("pyproject.toml") || existsRel("requirements.txt") || existsRel("setup.cfg") || existsRel("setup.py")) {
    langs.add("python");
  }
  if (existsRel("go.mod")) langs.add("go");
  if (existsRel("Dockerfile") || existsRel("dockerfile")) langs.add("docker");
  if (
    existsRel(".eslintrc.js") ||
    existsRel(".eslintrc.cjs") ||
    existsRel(".eslintrc.json") ||
    existsRel(".eslintrc.yaml") ||
    existsRel(".eslintrc.yml")
  ) {
    langs.add("javascript");
    langs.add("typescript");
  }
  if (existsRel(".luarc.json") || existsRel(".luarc.jsonc")) langs.add("lua");
  if (existsRel("README.md")) langs.add("markdown");
  return langs;
}
