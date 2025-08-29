import { GrepInputSchema, GrepOutputSchema } from "@magus/tools/src/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const GrepView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-grep") {
    return null;
  }

  const { toolCallId } = part;

  const icon = "📁";
  switch (part.state) {
    case "output-available": {
      const { pattern, path } = GrepInputSchema.parse(part.input);
      const { total_matches } = GrepOutputSchema.parse(part.output);
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} {`grep "${pattern}" ${path} - ${total_matches} total matches`}
          </Text>
        </Box>
      );
    }
    default:
      return null;
  }
};
