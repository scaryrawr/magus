import { Box } from "ink";
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

export const ToolView: React.FC<UIToolProps> = ({ part }) => {
  // Initialize the array inside the component to avoid circular dependency issues
  const toolViews = useMemo(
    () => [CreateFileView, FileEditToolView, FileInsertView, GrepView, ShellView, StringReplaceView, ViewFileView],
    [],
  );

  for (const view of toolViews) {
    const element = view({ part });
    if (
      element !== null &&
      (React.isValidElement(element) || typeof element === "string" || typeof element === "number")
    ) {
      return (
        <Box
          borderStyle="single"
          borderDimColor
          borderColor="yellow"
          flexDirection="column"
          width="80%"
          alignSelf="center"
        >
          {element}
        </Box>
      );
    }
  }

  return null;
};
