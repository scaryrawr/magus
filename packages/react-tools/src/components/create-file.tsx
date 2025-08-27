import { CreateFileSchema, DiffOutputSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const CreateFileView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-create_file") return null;

  const { toolCallId } = part;
  const icon = "✏️";

  switch (part.state) {
    case "output-available": {
      const { path } = CreateFileSchema.parse(part.input);
      const { diff } = DiffOutputSchema.parse(part.output);
      return (
        <Box flexDirection="column" key={toolCallId}>
          <Text>
            {icon} Create file {path}
          </Text>
          <Text>{diff}</Text>
        </Box>
      );
    }
    default:
      return null;
  }
};
