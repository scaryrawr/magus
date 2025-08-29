import type { ToolUIPart, UIDataTypes, UIMessagePart, UITools } from "ai";
import { Box, Text } from "ink";
import React, { useMemo } from "react";
import {
  CreateFileView,
  FileEditToolView,
  FileInsertView,
  GrepView,
  ShellView,
  StringReplaceView,
  ViewFileView,
} from ".";
import type { UIToolProps } from "./type";

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

export const ToolView: React.FC<UIToolProps> = ({ part }) => {
  // Initialize the array inside the component to avoid circular dependency issues
  const toolViews = useMemo(
    () => [CreateFileView, FileEditToolView, FileInsertView, GrepView, ShellView, StringReplaceView, ViewFileView],
    [],
  );

  if (!isToolPart(part)) {
    return null;
  }

  for (const view of toolViews) {
    const element = view({ part });
    if (
      element !== null &&
      (React.isValidElement(element) || typeof element === "string" || typeof element === "number")
    ) {
      return <ToolBox>{element}</ToolBox>;
    }
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
              valueMsg = String(value);
              break;
            case "object":
              if (Array.isArray(value)) {
                valueMsg = value.join(", ");
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
