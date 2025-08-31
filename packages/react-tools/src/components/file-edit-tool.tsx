import { DiffViewer } from "@magus/react";
import { EditorInputSchema, EditorOutputSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const FileEditToolView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-file_edit_tool") return null;

  const { toolCallId } = part;
  const icon = "✏️";
  const output = part.output ? EditorOutputSchema.parse(part.output) : undefined;
  const { diff } = typeof output === "object" ? output : { diff: "" };
  switch (part.state) {
    case "output-available": {
      const input = EditorInputSchema.parse(part.input);
      const { path } = input;
      switch (input.command) {
        case "view": {
          return (
            <Box flexDirection="row" key={toolCallId}>
              <Text>📖 Read {path}</Text>
            </Box>
          );
        }
        case "create": {
          return (
            <Box flexDirection="column" key={toolCallId}>
              <Text>
                {icon} Create file {path}
              </Text>
              <DiffViewer path={path}>{diff}</DiffViewer>
            </Box>
          );
        }
        case "insert": {
          return (
            <Box flexDirection="column" key={toolCallId}>
              <Text>
                {icon} Editing {path}
              </Text>
              <DiffViewer path={path}>{diff}</DiffViewer>
            </Box>
          );
        }
        case "str_replace": {
          return (
            <Box flexDirection="column" key={toolCallId}>
              <Text>
                {icon} Editing {path}
              </Text>
              <DiffViewer path={path}>{diff}</DiffViewer>
            </Box>
          );
        }
      }
    }
  }

  return null;
};
