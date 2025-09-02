import type {
  CreateFileToolSet,
  EditorToolSet,
  GrepToolSet,
  InsertToolSet,
  ShellToolSet,
  StringReplaceToolSet,
  ViewToolSet,
} from "@magus/tools";
import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";
import { Box, Text } from "ink";
import React, { useRef } from "react";
import { CreateFileView } from "./create-file";
import { FileEditToolView } from "./file-edit-tool";
import { FileInsertView } from "./file-insert";
import { GrepView } from "./grep";
import { ShellView } from "./shell";
import { StringReplaceView } from "./string-replace";
import type { UIToolProps } from "./types";
import { ViewFileView } from "./view-file";

type ToolBoxProps = React.PropsWithChildren;

const ToolBox: React.FC<ToolBoxProps> = ({ children }) => {
  return (
    <Box borderStyle="single" borderDimColor borderColor="yellow" flexDirection="column" width="80%" alignSelf="center">
      {children}
    </Box>
  );
};

const isToolPart = (part: UIMessagePart<UIDataTypes, UITools>): part is ToolUIPart => {
  return part.type.startsWith("tool-");
};

type ToolViewMapping<TTools> = {
  [K in keyof TTools as `tool-${string & K}`]: React.FC<UIToolProps>;
};

export const ToolView: React.FC<UIToolProps> = ({ part }) => {
  const toolViews = useRef<
    ToolViewMapping<
      CreateFileToolSet &
        EditorToolSet &
        GrepToolSet &
        StringReplaceToolSet &
        ShellToolSet &
        InsertToolSet &
        ViewToolSet
    >
  >({
    "tool-create_file": CreateFileView,
    "tool-file_interaction_tool": FileEditToolView,
    "tool-file_insert": FileInsertView,
    "tool-grep": GrepView,
    "tool-search": GrepView,
    "tool-shell": ShellView,
    "tool-replace": StringReplaceView,
    "tool-view": ViewFileView,
  }).current;

  if (!isToolPart(part)) {
    return null;
  }

  if (part.type in toolViews) {
    const SpecificToolView = toolViews[part.type as keyof typeof toolViews];
    return (
      <ToolBox>
        <SpecificToolView part={part} />
      </ToolBox>
    );
  }

  const { input } = part;
  let message: string = "";
  if (input) {
    switch (typeof input) {
      case "string":
        message = input;
        break;
      case "object":
        message = Object.entries(input).reduce((msg, [key, value]) => {
          let valueMsg: string = "";
          switch (typeof value) {
            case "string":
            case "number":
            case "boolean":
              valueMsg = String(value).slice(0, 50);
              break;
            case "object":
              if (Array.isArray(value)) {
                valueMsg = value.join(", ").slice(0, 50);
              }
          }

          return `${msg} --${key} "${valueMsg}"`;
        }, "");
        break;
      default:
        message = String(input);
        break;
    }
  }

  return (
    <ToolBox>
      <Text>
        ⚒️ {part.type.replace("tool-", "")} {message}
      </Text>
    </ToolBox>
  );
};
