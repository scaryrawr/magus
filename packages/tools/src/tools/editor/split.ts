import type { ToolSet } from "ai";
import { createCreateFileTool } from "./create";
import { createInsertTool } from "./insert";
import { createStringReplaceTool } from "./str_replace";
import { createViewTool } from "./view";

export const createSplitEditorTool = () => {
  return {
    ...createViewTool(),
    ...createCreateFileTool(),
    ...createInsertTool(),
    ...createStringReplaceTool(),
  } as const satisfies ToolSet;
};

export type SplitEditorToolSet = ReturnType<typeof createSplitEditorTool>;
