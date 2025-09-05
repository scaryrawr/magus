import type { ChatStatus } from "ai";
import React, { createContext, useContext, useMemo, useState, type ReactNode } from "react";

type ChatContextProps = {
  chatStatus: ChatStatus | undefined;
  setChatStatus: (status: ChatStatus | undefined) => void;
};

const ChatContext = createContext<ChatContextProps | null>(null);

type ChatContextProviderProps = {
  children: ReactNode;
};

export const ChatContextProvider: React.FC<ChatContextProviderProps> = ({ children }) => {
  const [chatStatus, setChatStatus] = useState<ChatStatus | undefined>(undefined);

  const context = useMemo<ChatContextProps>(
    () => ({
      chatStatus,
      setChatStatus,
    }),
    [chatStatus],
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
