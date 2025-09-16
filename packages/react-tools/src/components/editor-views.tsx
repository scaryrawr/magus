import { DiffViewer } from "@magus/react";
import highlight from "cli-highlight";
import { Box, Text } from "ink";
import React, { useMemo } from "react";

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
  path: string;
  icon?: string; // defaults to book
  content: string;
  range?: { start: number; end: number };
};

/**
 * Simple read action view without diff content.
 */
export const ReadView: React.FC<ReadViewProps> = ({ path, icon = "📖", content, range }) => {
  const language = path.split(".").pop() ?? undefined;
  const highlighted = useMemo(
    () => highlight(content, { language, ignoreIllegals: true }).split("\n"),
    [content, language],
  );

  const start = range?.start ?? 1;
  const numWidth = (range ? String(range.end).length : String(highlighted.length).length) + 1;
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <Text>{icon}</Text>
        <Text>{` Read ${path}`}</Text>
        {range ? <Text dimColor>{` [${range.start},${range.end}]`}</Text> : null}
      </Box>
      {highlighted.map((line, index) => (
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
