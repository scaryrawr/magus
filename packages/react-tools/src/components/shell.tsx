import { ShellInputSchema, ShellOutputSchema } from "@magus/tools";
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
      const { stdout: out, stderr: err } = ShellOutputSchema.parse(part.output);
      const stdout = out.trim();
      const stderr = err.trim();
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} {command}
          </Text>
          <Box flexDirection="column" width="80%">
            {stderr ? (
              <Text color="red" dimColor>
                {stderr}
              </Text>
            ) : null}
            {stdout ? <Text dimColor>{stdout}</Text> : null}
          </Box>
        </Box>
      );
    }
    default:
      return null;
  }
};
