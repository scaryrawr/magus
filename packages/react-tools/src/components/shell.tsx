import { ShellInputSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const ShellView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-shell") {
    return null;
  }

  const { toolCallId } = part;

  const icon = "🐚";
  switch (part.state) {
    case "output-available": {
      const { command } = ShellInputSchema.parse(part.input);
      return (
        <Box flexDirection="row" key={toolCallId}>
          <Text>{icon}</Text>
          <Text> {command}</Text>
        </Box>
      );
    }
    default:
      return null;
  }
};
