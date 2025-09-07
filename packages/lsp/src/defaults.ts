import path from "node:path";
import type { LspConfig } from "./lspManager";

export interface BuildDefaultsOptions {
  /** root directory for project (default: process.cwd()) */
  rootDir?: string;
  /** Optional override of command existence check for tests */
  commandExists?: (cmd: string) => boolean;
  /** Skip executable existence check (for lazy startup) */
  skipCommandCheck?: boolean;
  /** Only include languages specified (language ids). */
  includeLanguages?: string[];
  /** Additional custom configs to append (will still validate command). */
  extra?: LspConfig[];
}

/** Simple cross-platform check if an executable is resolvable. */
export function commandExists(cmd: string): boolean {
  if (cmd.includes(path.sep)) {
    try {
      return Bun.file(cmd).size >= 0;
    } catch {
      return false;
    }
  }

  return !!Bun.which(cmd);
}

/** Default language server definitions (similar to helix docs subset). */
export function defaultServerDefinitions(): LspConfig[] {
  return [
    {
      id: "typescript-language-server",
      name: "TypeScript Language Server",
      cmd: "typescript-language-server",
      args: ["--stdio"],
      selector: [
        { scheme: "file", language: "typescript", pattern: "**/*.ts" },
        { scheme: "file", language: "typescript", pattern: "**/*.tsx" },
        { scheme: "file", language: "javascript", pattern: "**/*.js" },
        { scheme: "file", language: "javascript", pattern: "**/*.jsx" },
      ],
    },
    {
      id: "eslint-lsp",
      name: "ESLint LSP",
      cmd: "vscode-eslint-language-server",
      args: ["--stdio"],
      selector: [
        { scheme: "file", language: "typescript", pattern: "**/*.ts" },
        { scheme: "file", language: "typescript", pattern: "**/*.tsx" },
        { scheme: "file", language: "javascript", pattern: "**/*.js" },
        { scheme: "file", language: "javascript", pattern: "**/*.jsx" },
      ],
    },
    {
      id: "pyright",
      name: "Pyright",
      cmd: "pyright-langserver",
      args: ["--stdio"],
      selector: [{ scheme: "file", language: "python", pattern: "**/*.py" }],
    },
    {
      id: "pylsp",
      name: "Python LSP Server (pylsp)",
      cmd: "pylsp",
      selector: [{ scheme: "file", language: "python", pattern: "**/*.py" }],
    },
    {
      id: "bashls",
      name: "Bash Language Server",
      cmd: "bash-language-server",
      args: ["start"],
      selector: [
        { scheme: "file", language: "bash", pattern: "**/*.sh" },
        { scheme: "file", language: "bash", pattern: "**/*.bash" },
      ],
    },
    {
      id: "jsonls",
      name: "JSON Language Server",
      cmd: "vscode-json-language-server",
      args: ["--stdio"],
      selector: [{ scheme: "file", language: "json", pattern: "**/*.json" }],
    },
    {
      id: "yaml-language-server",
      name: "YAML Language Server",
      cmd: "yaml-language-server",
      args: ["--stdio"],
      selector: [
        { scheme: "file", language: "yaml", pattern: "**/*.yml" },
        { scheme: "file", language: "yaml", pattern: "**/*.yaml" },
      ],
    },
    {
      id: "rust-analyzer",
      name: "Rust Analyzer",
      cmd: "rust-analyzer",
      selector: [{ scheme: "file", language: "rust", pattern: "**/*.rs" }],
    },
    {
      id: "gopls",
      name: "Go Language Server",
      cmd: "gopls",
      selector: [{ scheme: "file", language: "go", pattern: "**/*.go" }],
    },
    {
      id: "lua-language-server",
      name: "Lua Language Server",
      cmd: "lua-language-server",
      selector: [{ scheme: "file", language: "lua", pattern: "**/*.lua" }],
    },
    {
      id: "docker-langserver",
      name: "Dockerfile Language Server",
      cmd: "docker-langserver",
      args: ["--stdio"],
      selector: [
        { scheme: "file", language: "docker", pattern: "**/Dockerfile" },
        { scheme: "file", language: "docker", pattern: "**/dockerfile" },
      ],
    },
    {
      id: "css-lsp",
      name: "CSS Language Server",
      cmd: "vscode-css-language-server",
      args: ["--stdio"],
      selector: [{ scheme: "file", language: "css", pattern: "**/*.css" }],
    },
    {
      id: "html-lsp",
      name: "HTML Language Server",
      cmd: "vscode-html-language-server",
      args: ["--stdio"],
      selector: [
        { scheme: "file", language: "html", pattern: "**/*.html" },
        { scheme: "file", language: "html", pattern: "**/*.htm" },
      ],
    },
    {
      id: "marksman",
      name: "Markdown Language Server",
      cmd: "marksman",
      selector: [
        { scheme: "file", language: "markdown", pattern: "**/*.md" },
        { scheme: "file", language: "markdown", pattern: "**/*.markdown" },
      ],
    },
  ];
}

export function buildDefaultConfigs(opts: BuildDefaultsOptions = {}): LspConfig[] {
  const { commandExists: existsFn = commandExists, includeLanguages, extra = [], skipCommandCheck } = opts;
  const defs = [...defaultServerDefinitions(), ...extra];
  return defs.filter((def) => {
    if (!skipCommandCheck && !existsFn(def.cmd)) return false;
    if (includeLanguages) {
      const languages = new Set(includeLanguages);
      const selLangs = new Set(
        def.selector.map((s) => (typeof s === "string" ? s : s.language)).filter((l): l is string => Boolean(l)),
      );
      const intersects = Array.from(selLangs).some((l) => languages.has(l));
      if (!intersects) return false;
    }
    return true;
  });
}

export async function createDefaultLspManager(options: BuildDefaultsOptions = {}) {
  const configs = buildDefaultConfigs(options);
  const { LspManager } = await import("./lspManager");
  return new LspManager(configs, options.rootDir);
}

export type { LspConfig } from "./lspManager";
