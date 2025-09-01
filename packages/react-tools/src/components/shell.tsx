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

  const tailLines = (s: string, n = 3) => {
    const lines = s
      .replace(/\r/g, "\n")
      .split("\n")
      .map((line) => line.trimEnd())
      .filter(Boolean);
    return lines.slice(-n).join("\n");
  };

  const icon = "🐚";
  switch (part.state) {
    case "output-available": {
      const { command } = ShellInputSchema.parse(part.input);
      const { stdout, stderr } = ShellOutputSchema.parse(part.output);
      const stdoutTail = tailLines(stdout);
      const stderrTail = tailLines(stderr);
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} {command}
          </Text>
          <Box flexDirection="column" width="90%">
            {stderrTail ? (
              <Text color="red" dimColor>
                {`...\n${stderrTail}`}
              </Text>
            ) : null}
            {stdoutTail ? <Text dimColor>{`...\n${stdoutTail}`}</Text> : null}
          </Box>
        </Box>
      );
    }
    default:
      return null;
  }
};
