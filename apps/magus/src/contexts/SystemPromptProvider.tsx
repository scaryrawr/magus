import type { ToolSet } from "ai";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { useModelContext } from ".";
import { useServerContext } from "./ServerProvider";
import { useToolSetContext } from "./ToolSetProvider";

type SystemPromptConfig = {
  basePrompt?: string;
  instructions?: string[];
  getModelSpecificPrompt?: (provider: string | undefined, modelName: string | undefined) => string;
  getToolSpecificPrompt?: (tools: ToolSet | undefined) => string;
};

type SystemPromptContextProps = {
  systemPrompt: string;
  setBasePrompt: (prompt: string) => void;
  setInstructions: (instructions: string[]) => void;
  addInstruction: (instruction: string) => void;
  removeInstruction: (instruction: string) => void;
};

const SystemPromptContext = createContext<SystemPromptContextProps | null>(null);

type SystemPromptProviderProps = {
  children: ReactNode;
  config: SystemPromptConfig;
};

export const SystemPromptProvider: React.FC<SystemPromptProviderProps> = ({ children, config }) => {
  const { state } = useServerContext();
  const { tools } = useToolSetContext();
  const { provider, modelName } = useModelContext();
  const { getModelSpecificPrompt, getToolSpecificPrompt } = config;

  const [basePrompt, setBasePrompt] = useState(config.basePrompt || "");
  const [instructions, setInstructions] = useState<string[]>(config.instructions || []);

  // Calculate the full system prompt
  const systemPrompt = React.useMemo(() => {
    let prompt = basePrompt;

    // Add model-specific prompt if available
    const modelPrompt = getModelSpecificPrompt?.(provider, modelName);
    if (modelPrompt) {
      prompt += `\n\n${modelPrompt}`;
    }

    // Add tool-specific prompt if available
    const toolPrompt = getToolSpecificPrompt?.(tools);
    if (toolPrompt) {
      prompt += `\n\n${toolPrompt}`;
    }

    // Add instructions
    if (instructions.length > 0) {
      prompt += `\n\n${instructions.join("\n\n")}`;
    }

    return prompt;
  }, [basePrompt, getModelSpecificPrompt, getToolSpecificPrompt, instructions, provider, modelName, tools]);

  // Update server state when system prompt changes
  useEffect(() => {
    state.systemPrompt = systemPrompt;
  }, [state, systemPrompt]);

  const addInstruction = useCallback((instruction: string) => {
    setInstructions((prev) => [...prev, instruction]);
  }, []);

  const removeInstruction = useCallback((instruction: string) => {
    setInstructions((prev) => prev.filter((inst) => inst !== instruction));
  }, []);

  const contextValue = useMemo<SystemPromptContextProps>(() => {
    return {
      systemPrompt,
      setBasePrompt,
      setInstructions,
      addInstruction,
      removeInstruction,
    };
  }, [addInstruction, removeInstruction, systemPrompt]);

  return <SystemPromptContext.Provider value={contextValue}>{children}</SystemPromptContext.Provider>;
};

export const useSystemPromptContext = () => {
  const context = useContext(SystemPromptContext);
  if (!context) {
    throw new Error("useSystemPromptContext must be used within a SystemPromptProvider");
  }

  return context;
};
