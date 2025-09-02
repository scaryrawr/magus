import { EditorInputSchema, EditorOutputSchema, type EditorToolSet } from "@magus/tools";
import type { ToolUIPart } from "ai";
import { Box } from "ink";
import { EditorDiffView, ReadView } from "./editor-views";
import type { MessagePart, ToolSetToUITools, UIToolProps } from "./types";

const isEditorPart = (part: MessagePart): part is ToolUIPart<ToolSetToUITools<EditorToolSet>> => {
  const partCheck = part as ToolUIPart<ToolSetToUITools<EditorToolSet>>;
  return partCheck.type === "tool-file_interaction_tool";
};

export const FileEditToolView: React.FC<UIToolProps> = ({ part }) => {
  if (!isEditorPart(part)) return null;

  const { toolCallId } = part;
  const output = part.output ? EditorOutputSchema.parse(part.output) : undefined;
  const { diff } = typeof output === "object" ? output : { diff: "" };
  switch (part.state) {
    case "output-available": {
      const input = EditorInputSchema.parse(part.input);
      const { path } = input;
      switch (input.command) {
        case "view": {
          return (
            <Box key={toolCallId}>
              <ReadView path={path} />
            </Box>
          );
        }
        case "create": {
          return (
            <Box key={toolCallId}>
              <EditorDiffView action="Create file" path={path} diff={diff} />
            </Box>
          );
        }
        case "insert": {
          return (
            <Box key={toolCallId}>
              <EditorDiffView action="Editing" path={path} diff={diff} />
            </Box>
          );
        }
        case "replace": {
          return (
            <Box key={toolCallId}>
              <EditorDiffView action="Editing" path={path} diff={diff} />
            </Box>
          );
        }
      }
    }
  }

  return null;
};
