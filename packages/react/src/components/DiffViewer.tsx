import { highlight } from "cli-highlight";
import { Box, Text } from "ink";
import React from "react";

// Lean DiffViewer: internal rendering only (no external diff tools / subprocess)
// Accepts a unified diff string as children and the file path for syntax highlighting.

type DiffViewerProps = {
  path: string;
  children: string; // unified diff text
};

export const DiffViewer: React.FC<DiffViewerProps> = ({ children, path }) => {
  const { lines, oldWidth, newWidth } = React.useMemo(() => {
    const rawLines = children.split(/\r?\n/);
    const hunkRegex = /@@\s-(\d+)(?:,(\d+))?\s\+(\d+)(?:,(\d+))?\s@@/;

    // Collect maxima for width calc
    let maxOld = 0;
    let maxNew = 0;
    for (const l of rawLines) {
      if (l.startsWith("@@")) {
        const m = l.match(hunkRegex);
        if (m) {
          const oStart = parseInt(m[1], 10);
          const oCount = m[2] ? parseInt(m[2], 10) : 1;
          const nStart = parseInt(m[3], 10);
          const nCount = m[4] ? parseInt(m[4], 10) : 1;
          maxOld = Math.max(maxOld, oStart + oCount - 1);
          maxNew = Math.max(maxNew, nStart + nCount - 1);
        }
      }
    }
    if (maxOld === 0) maxOld = rawLines.length;
    if (maxNew === 0) maxNew = rawLines.length;
    const oldWidth = String(maxOld).length + 1;
    const newWidth = String(maxNew).length + 1;

    // Line counters updated per hunk line
    let oldLine = 0;
    let newLine = 0;

    const language = path.split(".").pop();

    const lines = rawLines.map((raw) => {
      if (raw.startsWith("@@")) {
        const m = raw.match(hunkRegex);
        if (m) {
          oldLine = parseInt(m[1], 10);
          newLine = parseInt(m[3], 10);
        }
        return { kind: "hunk", raw } as const;
      }
      if (raw.startsWith("--- ") || raw.startsWith("+++ ") || raw.startsWith("index ") || raw.startsWith("diff ")) {
        return { kind: "meta", raw } as const;
      }

      const firstChar = raw[0];
      let oldDisplay = "";
      let newDisplay = "";
      let bg: string | undefined;

      switch (firstChar) {
        case "+":
          newDisplay = String(newLine);
          newLine++;
          bg = "#0E2E01";
          break;
        case "-":
          oldDisplay = String(oldLine);
          oldLine++;
          bg = "#3E0405";
          break;
        case " ":
          oldDisplay = String(oldLine);
          newDisplay = String(newLine);
          oldLine++;
          newLine++;
          break;
        case "\\":
          break;
        default:
          break;
      }

      let contentPortion = raw;
      if (["+", "-", " "].includes(firstChar)) {
        contentPortion = raw.slice(1);
      }
      const highlighted = highlight(contentPortion, { language, ignoreIllegals: true });
      const renderedLine = ["+", "-", " "].includes(firstChar) ? firstChar + highlighted : highlighted;
      return { kind: "line", oldDisplay, newDisplay, renderedLine, bg } as const;
    });

    return { lines, oldWidth, newWidth };
  }, [children, path]);

  return (
    <Box flexDirection="column">
      {lines.map((l, idx) => {
        if (l.kind === "hunk" || l.kind === "meta") {
          return (
            <Box flexDirection="row" key={idx}>
              <Box
                width={oldWidth}
                borderDimColor
                borderStyle="single"
                borderBottom={false}
                borderTop={false}
                borderLeft={false}
              >
                <Text dimColor>{""}</Text>
              </Box>
              <Box
                width={newWidth}
                borderDimColor
                borderStyle="single"
                borderBottom={false}
                borderTop={false}
                borderLeft={false}
              >
                <Text dimColor>{""}</Text>
              </Box>
              <Box paddingLeft={1}>
                <Text dimColor>{l.raw}</Text>
              </Box>
            </Box>
          );
        }
        return (
          <Box flexDirection="row" key={idx}>
            <Box
              width={oldWidth}
              borderDimColor
              borderStyle="single"
              borderBottom={false}
              borderTop={false}
              borderLeft={false}
            >
              <Text dimColor>{l.oldDisplay}</Text>
            </Box>
            <Box
              width={newWidth}
              borderDimColor
              borderStyle="single"
              borderBottom={false}
              borderTop={false}
              borderLeft={false}
            >
              <Text dimColor>{l.newDisplay}</Text>
            </Box>
            <Box paddingLeft={1}>
              <Text backgroundColor={l.bg}>{l.renderedLine}</Text>
            </Box>
          </Box>
        );
      })}
    </Box>
  );
};
