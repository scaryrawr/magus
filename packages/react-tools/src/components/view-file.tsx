import { ViewSchema, type ViewToolSet } from "@magus/tools";
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
      const { path } = ViewSchema.parse(part.input);
      return (
        <Box key={toolCallId}>
          <ReadView path={path} />
        </Box>
      );
    }
    default:
      return null;
  }
};
