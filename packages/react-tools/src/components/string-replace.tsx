import { DiffOutputSchema, StringReplaceSchema, type StringReplaceToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box } from "ink";
import { EditorDiffView } from "./editor-views";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isStringReplacePart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<StringReplaceToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<StringReplaceToolSet>>;
  return partCheck.type === "tool-replace";
};

export const StringReplaceView: React.FC<UIToolProps> = ({ part }) => {
  if (!isStringReplacePart(part)) return null;

  const { toolCallId } = part;
  switch (part.state) {
    case "output-available": {
      const { diff } = DiffOutputSchema.parse(part.output);
      const { path } = StringReplaceSchema.parse(part.input);
      return (
        <Box key={toolCallId}>
          <EditorDiffView action="Editing" path={path} diff={diff} />
        </Box>
      );
    }
    default:
      return null;
  }
};
