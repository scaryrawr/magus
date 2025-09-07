// Central language detection utility to avoid duplication between LspManager
// and default server definitions. Extend here when adding new language support.

/** File extension (lowercase, with leading dot) to language id mapping */
const EXTENSION_LANGUAGE_MAP: Record<string, string> = {
  ".ts": "typescript",
  ".tsx": "typescript",
  ".js": "javascript",
  ".jsx": "javascript",
  ".py": "python",
  ".json": "json",
  ".yml": "yaml",
  ".yaml": "yaml",
  ".md": "markdown",
  ".markdown": "markdown",
  ".rs": "rust",
  ".go": "go",
  ".lua": "lua",
  ".sh": "bash",
  ".bash": "bash",
  ".css": "css",
  ".html": "html",
  ".htm": "html",
};

/** Special file basenames mapping (case-insensitive) */
const BASENAME_LANGUAGE_MAP: Record<string, string> = {
  dockerfile: "docker",
};

/** Detect language id from file path (heuristic). */
export function detectLanguage(file: string): string {
  const lower = file.toLowerCase();
  // Dockerfile special cases (basename and with dot e.g. Dockerfile.dev)
  if (/(^|\/)(dockerfile)(\.|$)/i.test(lower)) return "docker";

  // Check explicit basename mapping
  const baseMatch = lower.match(/([^/]+)$/);
  if (baseMatch) {
    const base = baseMatch[1];
    if (BASENAME_LANGUAGE_MAP[base]) return BASENAME_LANGUAGE_MAP[base];
  }

  // Check extensions (longest first to ensure .markdown over .md, .tsx over .ts)
  const sortedExts = Object.keys(EXTENSION_LANGUAGE_MAP).sort((a, b) => b.length - a.length);
  for (const ext of sortedExts) {
    if (lower.endsWith(ext)) return EXTENSION_LANGUAGE_MAP[ext];
  }
  return "plaintext";
}

export const __TESTING__ = { EXTENSION_LANGUAGE_MAP, BASENAME_LANGUAGE_MAP };
