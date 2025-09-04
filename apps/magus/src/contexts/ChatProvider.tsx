import type { ChatStatus } from "ai";
import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";
import { useSystemPromptContext } from "./SystemPromptProvider";

type ChatContextProps = {
  systemPrompt: string;
  chatStatus: ChatStatus | undefined;
  setChatStatus: (status: ChatStatus | undefined) => void;
};

const ChatContext = createContext<ChatContextProps | null>(null);

type ChatContextProviderProps = {
  children: ReactNode;
};

export const ChatContextProvider: React.FC<ChatContextProviderProps> = ({ children }) => {
  const [chatStatus, setChatStatus] = useState<ChatStatus | undefined>(undefined);
  const { systemPrompt } = useSystemPromptContext();

  const context = useMemo<ChatContextProps>(
    () => ({
      systemPrompt,
      chatStatus,
      setChatStatus,
    }),
    [systemPrompt, chatStatus],
  );

  return <ChatContext.Provider value={context}>{children}</ChatContext.Provider>;
};

export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within an ChatContextProvider");
  }

  return context;
};
