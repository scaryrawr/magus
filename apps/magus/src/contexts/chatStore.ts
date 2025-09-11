import type { ChatStatus } from "ai";
import { create } from "zustand";

interface ChatState {
  chatStatus: ChatStatus | undefined;
  setChatStatus: (status: ChatStatus | undefined) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  chatStatus: undefined,
  setChatStatus: (status) => set({ chatStatus: status }),
}));

// Selectors / hooks
export const useChatStatus = () => useChatStore((s) => s.chatStatus);
export const useSetChatStatus = () => useChatStore((s) => s.setChatStatus);
