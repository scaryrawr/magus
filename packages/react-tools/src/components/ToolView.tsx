import type {
  CreateFileToolSet,
  EditorToolSet,
  GrepToolSet,
  InsertToolSet,
  ShellToolSet,
  StringReplaceToolSet,
  TodoToolSet,
  ViewToolSet,
} from "@magus/tools";
import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";
import { Box, Text, type BoxProps } from "ink";
import React, { useRef } from "react";
import { CreateFileView } from "./create-file";
import { FileEditToolView } from "./file-edit-tool";
import { FileInsertView } from "./file-insert";
import { GrepView } from "./grep";
import { ShellView } from "./shell";
import { StringReplaceView } from "./string-replace";
import { TodoView } from "./todo";
import type { UIToolProps } from "./types";
import { ViewFileView } from "./view-file";

type ToolBoxProps = Omit<BoxProps, "borderLeft" | "borderRight" | "flexDirection"> & React.PropsWithChildren;

const ToolBox: React.FC<ToolBoxProps> = ({ children, ...props }) => {
  if (!children) return null;
  return (
    <Box
      borderColor="blueBright"
      borderLeft={false}
      borderRight={false}
      borderStyle="double"
      flexDirection="column"
      {...props}
    >
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
        TodoToolSet &
        ViewToolSet
    >
  >({
    "tool-create_file": CreateFileView,
    "tool-editor": FileEditToolView,
    "tool-file_insert": FileInsertView,
    "tool-grep": GrepView,
    "tool-search": GrepView,
    "tool-shell": ShellView,
    "tool-replace": StringReplaceView,
    "tool-view": ViewFileView,
    "tool-todo": TodoView,
    "tool-todo_add": TodoView,
    "tool-todo_clear": TodoView,
    "tool-todo_list": TodoView,
    "tool-todo_update": TodoView,
  }).current;

  if (!isToolPart(part)) {
    return null;
  }

  const toolName = part.type.replace("tool-", "");

  if (part.state === "output-error") {
    return (
      <ToolBox alignItems="center">
        <Text color="red">❗⚒️❗ Tool Error: {toolName} ❗⚒️❗</Text>
        <Text color="red">{part.errorText}</Text>
      </ToolBox>
    );
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
        message = "";
        break;
    }
  }

  return (
    <ToolBox>
      <Text>
        ⚒️ {toolName} {message}
      </Text>
    </ToolBox>
  );
};
