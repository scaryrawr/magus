import { GrepInputSchema, GrepOutputSchema, type GrepToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box, Text } from "ink";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isGrepPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<GrepToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<GrepToolSet>>;
  return partCheck.type === "tool-grep" || partCheck.type === "tool-search";
};

export const GrepView: React.FC<UIToolProps> = ({ part }) => {
  if (!isGrepPart(part)) return null;

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
