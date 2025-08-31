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

  return (
    <ToolBox>
      <Text>⚒️ Calling {part.type.replace("tool-", "")} tool...</Text>
    </ToolBox>
  );
};
