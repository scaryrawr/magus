import ignore from "ignore";
import { readFileSync } from "node:fs";

export const DEFAULT_IGNORE_PATTERNS = [".git", ".yarn", ".backfill", "node_modules"];

export function gitignoreFilter(rootDir: string) {
  const ig = ignore({
    ignorecase: true,
    allowRelativePaths: true,
  });

  DEFAULT_IGNORE_PATTERNS.forEach((pattern) => ig.add(pattern));

  try {
    const gitignorePath = `${rootDir}/.gitignore`;
    const gitignoreContent = readFileSync(gitignorePath, "utf-8");
    ig.add(gitignoreContent);
  } catch {
    // May have failed to load .gitignore, which is fine, just use defaults.
  }

  return ig;
}

export const gitignore = gitignoreFilter(process.cwd());
