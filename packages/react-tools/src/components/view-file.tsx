import { ViewOutputSchema, ViewSchema, type ViewToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box } from "ink";
import { ReadView } from "./editor-views";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isViewPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<ViewToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<ViewToolSet>>;
  return partCheck.type === "tool-view";
};

export const ViewFileView: React.FC<UIToolProps> = ({ part }) => {
  if (!isViewPart(part)) return null;

  const { toolCallId } = part;
  switch (part.state) {
    case "output-available": {
      const { path, view_range } = ViewSchema.parse(part.input);
      const { content } = ViewOutputSchema.parse(part.output);
      return (
        <Box key={toolCallId}>
          <ReadView path={path} content={content} range={view_range} />
        </Box>
      );
    }
    default:
      return null;
  }
};
