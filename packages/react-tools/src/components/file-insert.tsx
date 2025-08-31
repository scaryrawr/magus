import { DiffViewer } from "@magus/react";
import { DiffOutputSchema, InsertFileSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const FileInsertView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-file_insert") return null;

  const { toolCallId } = part;
  const icon = "✏️";

  switch (part.state) {
    case "output-available": {
      const { diff } = DiffOutputSchema.parse(part.output);
      const { path } = InsertFileSchema.parse(part.input);
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} Editing {path}
          </Text>
          <DiffViewer path={path}>{diff}</DiffViewer>
        </Box>
      );
    }
    default:
      return null;
  }
};
