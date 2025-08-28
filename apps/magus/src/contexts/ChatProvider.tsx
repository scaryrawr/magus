import type { ChatStatus } from "ai";
import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerContext } from "./ServerProvider";

type ChatContextProps = {
  systemPrompt: string | undefined;
  instructions?: string[] | undefined;
  setInstructions: (instructions: string[] | undefined) => void;
  setSystemPrompt: (prompt: string | undefined) => void;
  chatStatus: ChatStatus | undefined;
  setChatStatus: (status: ChatStatus | undefined) => void;
};

const ChatContext = createContext<ChatContextProps | null>(null);

type ChatContextProviderProps = {
  children: ReactNode;
  systemPrompt?: string;
  instructions?: string[];
};

export const ChatContextProvider: React.FC<ChatContextProviderProps> = ({
  systemPrompt: systemBase,
  instructions: initialInstructions,
  children,
}) => {
  const [systemPromptBase, setSystemPrompt] = useState<string | undefined>(systemBase ?? "");
  const [instructions, setInstructions] = useState<string[] | undefined>(initialInstructions);
  const [chatStatus, setChatStatus] = useState<ChatStatus | undefined>(undefined);
  const { state } = useServerContext();

  const systemPrompt = instructions
    ? `${systemPromptBase ?? ""}\n${instructions?.join("\n")}`
    : (systemPromptBase ?? "");

  useEffect(() => {
    state.systemPrompt = systemPrompt;
  }, [state, systemPrompt]);

  const context: ChatContextProps = {
    systemPrompt,
    instructions,
    setInstructions,
    setSystemPrompt,
    chatStatus,
    setChatStatus,
  };

  return <ChatContext.Provider value={context}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within an ChatContextProvider");
  }

  return context;
};
