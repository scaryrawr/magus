import { DiffOutputSchema, InsertFileSchema, type InsertToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box } from "ink";
import { EditorDiffView } from "./editor-views";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isInsertPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<InsertToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<InsertToolSet>>;
  return partCheck.type === "tool-file_insert";
};

export const FileInsertView: React.FC<UIToolProps> = ({ part }) => {
  if (!isInsertPart(part)) return null;

  const { toolCallId } = part;
  switch (part.state) {
    case "output-available": {
      const { diff } = DiffOutputSchema.parse(part.output);
      const { path } = InsertFileSchema.parse(part.input);
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
