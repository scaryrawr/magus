import { ShellInputSchema, ShellOutputSchema, type ShellToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box, Text } from "ink";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isShellPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<ShellToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<ShellToolSet>>;
  return partCheck.type === "tool-shell";
};

export const ShellView: React.FC<UIToolProps> = ({ part }) => {
  if (!isShellPart(part)) return null;

  const { toolCallId } = part;

  const icon = "🐚";
  switch (part.state) {
    case "output-available": {
      const { command } = ShellInputSchema.parse(part.input);
      const { stdout, stderr } = ShellOutputSchema.parse(part.output);
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} {command}
          </Text>
          <Box flexDirection="column" width="90%">
            {stderr ? (
              <Box>
                <Text color="red" dimColor>
                  {stderr}
                </Text>
              </Box>
            ) : null}
            {stdout ? (
              <Box>
                <Text dimColor>{`...\n${stdout}`}</Text>
              </Box>
            ) : null}
          </Box>
        </Box>
      );
    }
    default:
      return null;
  }
};
