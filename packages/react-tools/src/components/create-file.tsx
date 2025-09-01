import { CreateFileSchema, DiffOutputSchema, type CreateFileToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box } from "ink";
import { EditorDiffView } from "./editor-views";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isCreateFilePart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<CreateFileToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<CreateFileToolSet>>;
  return partCheck.type === "tool-create_file";
};

export const CreateFileView: React.FC<UIToolProps> = ({ part }) => {
  if (!isCreateFilePart(part)) return null;

  const { toolCallId } = part;
  switch (part.state) {
    case "output-available": {
      const { path } = CreateFileSchema.parse(part.input);
      const { diff } = DiffOutputSchema.parse(part.output);
      return (
        <Box key={toolCallId}>
          <EditorDiffView action="Create file" path={path} diff={diff} />
        </Box>
      );
    }
    default:
      return null;
  }
};
