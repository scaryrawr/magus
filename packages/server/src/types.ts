import type { MagusProvider } from "@magus/providers";
import type { LanguageModel, ToolSet } from "ai";
import type { Hono } from "hono";
import z from "zod";

export const MagusChatSchema = z.object({
  title: z.string().optional(),
  // messages use AI SDK structure, opaque to us
  messages: z.array(z.any()),
});

export type MagusChat = z.infer<typeof MagusChatSchema>;

export type ChatStore = {
  createChat: () => Promise<string>;
  getChats: () => Promise<{ id: string; title?: string }[]>;
  loadChat: (chatId: string) => Promise<MagusChat>;
  saveChat: (chatId: string, chat: MagusChat) => Promise<void>;
};

export type ServerState = {
  providers: readonly MagusProvider[];
  model?: LanguageModel | undefined;
  tools?: ToolSet | undefined;
  systemPrompt?: string | undefined;
  readonly chatStore: ChatStore;
};

export type RouterFactory<THono extends Hono = Hono> = (state: ServerState) => THono;
