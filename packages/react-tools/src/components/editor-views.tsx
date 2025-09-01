import { DiffViewer } from "@magus/react";
import { Box, Text } from "ink";
import React from "react";

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
};

/**
 * Simple read action view without diff content.
 */
export const ReadView: React.FC<ReadViewProps> = ({ path, icon = "📖" }) => {
  return (
    <Box flexDirection="row">
      <Text>{icon}</Text>
      <Text>{` Read ${path}`}</Text>
    </Box>
  );
};
