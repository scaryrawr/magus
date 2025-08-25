import { type ToolSet } from "ai";

/**
 * Inserts human-in-the-loop functionality into a toolset by wrapping specified tools to require user approval before execution.
 * @param toolSet The toolset being augmented
 * @param tools The tools to extract the execute function from to require human-in-the-loop approval
 * @returns The augmented toolset with human-in-the-loop functionality
 */
export const insertHumanInTheLoop = <TToolSet extends ToolSet, TToolName extends keyof TToolSet>(
  toolSet: TToolSet,
  toolNames: TToolName[],
) => {
  const wrappedTools = { ...toolSet };
  const wrappedExecutes: Partial<Record<TToolName, TToolSet[TToolName]["execute"]>> = {};
  for (const toolName of toolNames) {
    if (!wrappedTools[toolName]) {
      continue;
    }

    wrappedExecutes[toolName] = wrappedTools[toolName].execute;
    delete wrappedTools[toolName].execute;
  }

  return {
    toolSet: wrappedTools,
    toolExecutes: wrappedExecutes,
  };
};
