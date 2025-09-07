import ignore from "ignore";

export const DEFAULT_IGNORE_PATTERNS = [".git", ".yarn", ".backfill", "node_modules"];

export async function gitignoreFilter(rootDir: string) {
  const ig = ignore({
    ignorecase: true,
    allowRelativePaths: true,
  });

  DEFAULT_IGNORE_PATTERNS.forEach((pattern) => ig.add(pattern));

  try {
    const gitignorePath = `${rootDir}/.gitignore`;
    const gitignoreContent = await Bun.file(gitignorePath).text();
    ig.add(gitignoreContent);
  } catch {
    // May have failed to load .gitignore, which is fine, just use defaults.
  }

  return ig;
}

export const gitignore = await gitignoreFilter(process.cwd());
