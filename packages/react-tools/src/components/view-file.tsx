import { ViewSchema } from "@magus/tools";
import { Box, Text } from "ink";
import type { UIToolProps } from "./type";

export const ViewFileView: React.FC<UIToolProps> = ({ part }) => {
  if (part.type !== "tool-view_file") return null;

  const { toolCallId } = part;
  const icon = "👀";

  switch (part.state) {
    case "output-available": {
      const { path } = ViewSchema.parse(part.input);
      return (
        <Box flexDirection="row" key={toolCallId}>
          <Text>{icon}</Text>
          <Text>{` Read ${path}.`}</Text>
        </Box>
      );
    }
    default:
      return null;
  }
};
