import { DiffOutputSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const FileInsertView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-file_insert") return null;

  const { toolCallId } = part;
  const icon = "✏️";

  switch (part.state) {
    case "output-available": {
      const { diff } = DiffOutputSchema.parse(part.output);
      return (
        <Box flexDirection="row" key={toolCallId}>
          <Text>{icon}</Text>
          <Text>{diff}</Text>
        </Box>
      );
    }
    default:
      return null;
  }
};
