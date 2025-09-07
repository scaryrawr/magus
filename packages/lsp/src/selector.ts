import path from "node:path";
import type { DocumentFilter, DocumentSelector } from "vscode-languageserver-protocol";
import { detectLanguage } from "./languages";

/** Convert a glob-like pattern (VSCode style) into a RegExp. Supports **, *, ? . */
export function globToRegex(inputPattern: string): RegExp {
  // Normalize pattern: drop leading './' segments, convert backslashes to forward slashes
  const pattern = inputPattern.replace(/\\/g, "/").replace(/^\.\/+/, "");
  const specials = /[.+^${}()|[\]\\]/g; // characters to escape
  let rx = "";
  for (let i = 0; i < pattern.length; ) {
    const ch = pattern[i];
    if (ch === "*") {
      if (pattern[i + 1] === "*") {
        rx += ".*"; // ** => match across path segments
        i += 2;
      } else {
        rx += "[^/]*"; // * => within a single segment
        i += 1;
      }
    } else if (ch === "?") {
      rx += "[^/]"; // single non-separator
      i += 1;
    } else {
      rx += ch.replace(specials, "\\$&");
      i += 1;
    }
  }
  return new RegExp(`^${rx}$`);
}

/** Determine if a file path matches a given DocumentSelector entry list. */
export function matchesSelector(file: string, rootDir: string, selector: DocumentSelector): boolean {
  const languageId = detectLanguage(file);

  return selector.some((filter: string | DocumentFilter) => {
    if (typeof filter === "string") {
      return filter === languageId;
    }
    if (filter.language && filter.language !== languageId) return false;
    type PatFilter = { pattern?: string; scheme?: string };
    const pf = filter as PatFilter;
    if (pf.scheme && pf.scheme !== "file") return false;
    const pattern = pf.pattern;
    if (pattern) {
      // Relative path from root normalized to forward slashes for glob matching
      const relRaw = path.relative(rootDir, file) || file;
      const rel = relRaw.split(path.sep).join("/");
      const rx = globToRegex(pattern);
      if (!rx.test(rel)) return false;
    }
    return true;
  });
}

export const __TESTING__ = { globToRegex };
