import { ChatUsageSchema } from "@magus/server";
import type { ChatStatus, LanguageModelUsage } from "ai";
import { useEffect, useState } from "react";
import { create } from "zustand";
import { subscribeToSse } from "../utils/sseManager";
import { useServerContext } from "./ServerProvider";

interface ChatState {
  chatStatus: ChatStatus | undefined;
  setChatStatus: (status: ChatStatus | undefined) => void;
  chatId: string | undefined;
  setChatId: (id: string | undefined) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chatStatus: undefined,
  setChatStatus: (status) => set({ chatStatus: status }),
  chatId: undefined,
  setChatId: (id) => set({ chatId: id }),
}));

// Selectors / hooks
export const useChatStatus = () => useChatStore((s) => s.chatStatus);
export const useSetChatStatus = () => useChatStore((s) => s.setChatStatus);
export const useChatId = () => useChatStore((s) => s.chatId);
export const useSetChatId = () => useChatStore((s) => s.setChatId);

export const useChatUsage = (chatId: string | undefined) => {
  const { server } = useServerContext();
  const [usage, setUsage] = useState<LanguageModelUsage | null>(null);
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
