import { DiffOutputSchema, StringReplaceSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const StringReplaceView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-string_replace") return null;

  const { toolCallId } = part;
  const icon = "✏️";

  switch (part.state) {
    case "output-available": {
      const { diff } = DiffOutputSchema.parse(part.output);
      const { path } = StringReplaceSchema.parse(part.input);
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} Modifying {path}
          </Text>
          <Text>{diff}</Text>
        </Box>
      );
    }
    default:
      return null;
  }
};
