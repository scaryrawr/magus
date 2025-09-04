import type { LanguageModel, ToolSet } from "ai";
import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useModelContext } from ".";
import { useServerContext } from "./ServerProvider";

type ToolSetInfo = {
  tools: ToolSet | undefined;
};

type ToolSetProviderProps = {
  children: ReactNode;
  getToolSet: (model: LanguageModel | undefined) => ToolSet | undefined;
};

const ToolSetContext = createContext<ToolSetInfo>({
  tools: undefined,
});

export const ToolSetProvider: React.FC<ToolSetProviderProps> = ({ children, getToolSet }) => {
  const { state: serverState } = useServerContext();
  const { model } = useModelContext();
  const [toolSet, setToolset] = useState(() => getToolSet(model));

  useEffect(() => {
    // Update server tools whenever toolset changes
    serverState.tools = toolSet;
  }, [serverState, toolSet]);

  useEffect(() => {
    setToolset(getToolSet(model));
  }, [model, getToolSet]);

  const value = useMemo<ToolSetInfo>(() => ({ tools: toolSet }), [toolSet]);

  return <ToolSetContext.Provider value={value}>{children}</ToolSetContext.Provider>;
};

export const useToolSetContext = (): ToolSetInfo => {
  const context = useContext(ToolSetContext);
  if (!context) {
    throw new Error("useToolSetContext must be used within a ToolSetProvider");
  }

  return context;
};
