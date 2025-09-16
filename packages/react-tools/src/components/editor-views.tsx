import { DiffViewer } from "@magus/react";
import highlight from "cli-highlight";
import { Box, Text } from "ink";
import { stat } from "node:fs/promises";
import React, { useEffect, useMemo, useState } from "react";

type EditorDiffViewProps = {
  path: string;
  diff: string;
  action: string; // e.g., "Create file", "Editing", "Modifying"
  icon?: string; // defaults to pencil
};

/**
 * Generic diff-based editor action view used by multiple tools.
 * Renders a label line and a unified DiffViewer for the provided path/diff.
 */
export const EditorDiffView: React.FC<EditorDiffViewProps> = ({ path, diff, action, icon = "✏️" }) => {
  return (
    <Box flexDirection="column">
      <Text>
        {icon} {action} {path}
      </Text>
      <DiffViewer path={path}>{diff}</DiffViewer>
    </Box>
  );
};

type ReadViewProps = {
  path: string; // file or directory path
  icon?: string; // defaults to book (file) or folder (directory)
  content: string; // file content or directory listing (newline separated)
  range?: { start: number; end: number }; // only honored for files
};

/**
 * Simple read action view without diff content.
 */
export const ReadView: React.FC<ReadViewProps> = ({ path, icon, content, range }) => {
  const [isDirectory, setIsDirectory] = useState<boolean | null>(null);
  useEffect(() => {
    let alive = true;
    void (async () => {
      try {
        const s = await stat(path);
        if (alive) setIsDirectory(s.isDirectory());
      } catch {
        if (alive) setIsDirectory(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [path]);

  // While unknown, optimistic assume file (to avoid layout jump) but show a small loading dim tag.
  const language = path.split(".").pop() ?? undefined;
  const fileLines = useMemo(
    () => highlight(content, { language, ignoreIllegals: true }).split("\n"),
    [content, language],
  );
  const directoryLines = useMemo(() => content.split("\n"), [content]);

  if (isDirectory) {
    const displayIcon = icon ?? "📁";
    return (
      <Box flexDirection="column">
        <Box flexDirection="row">
          <Text>{displayIcon}</Text>
          <Text>{` Dir ${path}`}</Text>
          {isDirectory === null ? <Text dimColor> (loading)</Text> : null}
        </Box>
        {directoryLines.map((line, idx) => (
          <Box key={idx}>
            <Text>{line}</Text>
          </Box>
        ))}
      </Box>
    );
  }

  const start = range?.start ?? 1;
  const numWidth = (range ? String(range.end).length : String(fileLines.length).length) + 1;
  const displayIcon = icon ?? "📖";
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text>{displayIcon}</Text>
        <Text>{` Read ${path}`}</Text>
        {range ? <Text dimColor>{` [${range.start},${range.end}]`}</Text> : null}
        {isDirectory === null ? <Text dimColor> (checking)</Text> : null}
      </Box>
      {fileLines.map((line, index) => (
        <Box flexDirection="row" key={index}>
          <Box
            width={numWidth}
            borderDimColor
            borderStyle="single"
            borderBottom={false}
            borderTop={false}
            borderLeft={false}
          >
            <Text dimColor>{`${start + index}`}</Text>
          </Box>
          <Box paddingLeft={1}>
            <Text>{line}</Text>
          </Box>
        </Box>
      ))}
    </Box>
  );
};

// DirectoryReadView merged into ReadView logic above to simplify callers.
