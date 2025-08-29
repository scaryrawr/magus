import type { LanguageModel, ToolSet } from "ai";
import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useModelContext } from ".";
import { useServerContext } from "./ServerProvider";
import { useToolSetContext } from "./ToolSetProvider";

type SystemPromptConfig = {
  basePrompt?: string;
  instructions?: string[];
  getModelSpecificPrompt?: (model: LanguageModel | undefined) => string;
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

const DEFAULT_BASE_PROMPT =
  "You are Magus, an AI assistant that helps users with software engineering tasks. Provide clear and concise answers to their questions. When asked to perform tasks, create a checklist of steps to complete the task. Use the available tools when necessary, and always explain your reason for using the tool. Do not end your turn until your checklist is completely done. Only perform actions that are on your checklist. You are a wizard, you talk like Gandalf. You aim to inspire. When you see bad coding practices or anti-patterns, you should be open about it and speak as Gandalf would when concerned or deep in thought.";

export const SystemPromptProvider: React.FC<SystemPromptProviderProps> = ({ children, config }) => {
  const { state } = useServerContext();
  const { tools } = useToolSetContext();
  const { model } = useModelContext();

  const [basePrompt, setBasePrompt] = useState(config.basePrompt || DEFAULT_BASE_PROMPT);
  const [instructions, setInstructions] = useState<string[]>(config.instructions || []);

  // Calculate the full system prompt
  const systemPrompt = React.useMemo(() => {
    let prompt = basePrompt;

    // Add model-specific prompt if available
    if (config.getModelSpecificPrompt) {
      const modelPrompt = config.getModelSpecificPrompt(model);
      if (modelPrompt) {
        prompt += `\n\n${modelPrompt}`;
      }
    }

    // Add tool-specific prompt if available
    if (config.getToolSpecificPrompt) {
      const toolPrompt = config.getToolSpecificPrompt(tools);
      if (toolPrompt) {
        prompt += `\n\n${toolPrompt}`;
      }
    }

    // Add instructions
    if (instructions.length > 0) {
      prompt += `\n\n${instructions.join("\n")}`;
    }

    return prompt;
  }, [basePrompt, model, tools, instructions, config]);

  // Update server state when system prompt changes
  useEffect(() => {
    state.systemPrompt = systemPrompt;
  }, [state, systemPrompt]);

  const addInstruction = (instruction: string) => {
    setInstructions((prev) => [...prev, instruction]);
  };

  const removeInstruction = (instruction: string) => {
    setInstructions((prev) => prev.filter((inst) => inst !== instruction));
  };

  const contextValue: SystemPromptContextProps = {
    systemPrompt,
    setBasePrompt,
    setInstructions,
    addInstruction,
    removeInstruction,
  };

  return <SystemPromptContext.Provider value={contextValue}>{children}</SystemPromptContext.Provider>;
};

export const useSystemPromptContext = () => {
  const context = useContext(SystemPromptContext);
  if (!context) {
    throw new Error("useSystemPromptContext must be used within a SystemPromptProvider");
  }

  return context;
};
