import { DiffViewer } from "@magus/react";
import { Box, Text } from "ink";
import { statSync } from "node:fs";
import React, { useMemo } from "react";
import { DirectoryReadView } from "./directory-read-view";
import { FileReadView } from "./file-read-view";

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
  const fileStat = useMemo(() => {
    const s = statSync(path);
    return s.isDirectory() ? "directory" : "file";
  }, [path]);

  if (fileStat === "directory") {
    return <DirectoryReadView path={path} icon={icon} content={content} />;
  }

  return <FileReadView path={path} icon={icon} content={content} range={range} />;
};

// DirectoryReadView merged into ReadView logic above to simplify callers.
