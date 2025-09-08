import type { ToolSet } from "ai";
import { createCreateFileTool } from "./create";
import { createInsertTool } from "./insert";
import { createStringReplaceTool } from "./str_replace";
import type { EditorOutputPlugin } from "./types";
import { createViewTool } from "./view";

export const createSplitEditorTool = (plugins?: EditorOutputPlugin) => {
  return {
    ...createViewTool(plugins),
    ...createCreateFileTool(plugins),
    ...createInsertTool(plugins),
    ...createStringReplaceTool(plugins),
  } as const satisfies ToolSet;
};

export type SplitEditorToolSet = ReturnType<typeof createSplitEditorTool>;
