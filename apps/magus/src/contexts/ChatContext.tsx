import type { ChatUsage } from "@magus/server";
import { ChatUsageSchema } from "@magus/server";
import type { ChatStatus } from "ai";
import React, { createContext, useCallback, useContext, useEffect, useReducer, useState } from "react";
import { subscribeToSse } from "../utils/sseManager";
import { useServerContext } from "./ServerProvider";

// State shape - keeping exact same interface as original chatStore
interface ChatState {
  chatStatus: ChatStatus | undefined;
  chatId: string | undefined;
}

// Action types for the reducer
type ChatAction =
  | { type: "SET_CHAT_STATUS"; payload: ChatStatus | undefined }
  | { type: "SET_CHAT_ID"; payload: string | undefined };

// Reducer function
function chatReducer(state: ChatState, action: ChatAction): ChatState {
  switch (action.type) {
    case "SET_CHAT_STATUS":
      return { ...state, chatStatus: action.payload };
    case "SET_CHAT_ID":
      return { ...state, chatId: action.payload };
    default:
      return state;
  }
}

// Context value type
export interface ChatContextValue {
  chatStatus: ChatStatus | undefined;
  chatId: string | undefined;
  setChatStatus: (status: ChatStatus | undefined) => void;
  setChatId: (id: string | undefined) => void;
}

// Create the context
const ChatContext = createContext<ChatContextValue | null>(null);

// Provider component
export const ChatProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, dispatch] = useReducer(chatReducer, {
    chatStatus: undefined,
    chatId: undefined,
  });

  const setChatStatus = useCallback((status: ChatStatus | undefined) => {
    dispatch({ type: "SET_CHAT_STATUS", payload: status });
  }, []);

  const setChatId = useCallback((id: string | undefined) => {
    dispatch({ type: "SET_CHAT_ID", payload: id });
  }, []);

  const value: ChatContextValue = {
    chatStatus: state.chatStatus,
    chatId: state.chatId,
    setChatStatus,
    setChatId,
  };

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
};

// Main hook for consuming the context
export const useChatContext = () => {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatContext must be used within a ChatProvider");
  }
  return context;
};

// Individual selector hooks for backward compatibility
export const useChatStatus = () => useChatContext().chatStatus;
export const useSetChatStatus = () => useChatContext().setChatStatus;
export const useChatId = () => useChatContext().chatId;
export const useSetChatId = () => useChatContext().setChatId;

// Keep the SSE-based usage hook as it's stateless and independent
export const useChatUsage = (chatId: string | undefined) => {
  const { server } = useServerContext();
  const [usage, setUsage] = useState<ChatUsage | null>(null);
  useEffect(() => {
    if (!chatId) return;

    const url = new URL(`v0/chat/${chatId}/sse`, server.url).href;

    const usageHandler = (event: MessageEvent<string>) => {
      const data = ChatUsageSchema.safeParse(JSON.parse(event.data));
      if (!data.success) return;
      setUsage(data.data);
    };

    const unsubscribe = subscribeToSse(url, "usage", usageHandler);

    return () => {
      unsubscribe();
    };
  }, [chatId, server.url]);

  return usage;
};
