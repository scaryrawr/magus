import type { MagusProvider } from "@magus/providers";
import type { LanguageModel, ToolSet, UIMessage } from "ai";
import z from "zod";

export const ChatUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  reasoningTokens: z.number().optional(),
  cachedInputTokens: z.number().optional(),
});

export type ChatUsage = z.infer<typeof ChatUsageSchema>;

export const MagusChatSchema = z.object({
  title: z.string().optional(),
  // messages use AI SDK structure, opaque to us
  messages: z.array(z.any()),
});

export type MagusChat = Omit<z.infer<typeof MagusChatSchema>, "messages"> & {
  messages: UIMessage[];
};

// Summary information for listing chats
export type ChatEntry = {
  id: string;
  title?: string;
  modifiedAt: Date;
};

export type ChatStore = {
  createChat: () => Promise<string>;
  getChats: () => Promise<ChatEntry[]>;
  loadChat: (chatId: string) => Promise<MagusChat>;
  saveChat: (chatId: string, chat: MagusChat) => Promise<void>;
};

type ProviderToolSets<TProviders extends MagusProvider = MagusProvider> = {
  [Key in keyof TProviders & string]: ToolSet | undefined;
};

export type ServerStateConfig<MProvider extends MagusProvider = MagusProvider> = {
  providers: MProvider;
  model?: LanguageModel | undefined;
  systemPrompt?: string | undefined;
  readonly chatStore: ChatStore;
} & (
  | { tools: ToolSet | undefined }
  | {
      providerTools: ProviderToolSets<MProvider>;
    }
);

export type ServerState = {
  providers: MagusProvider;
  model: LanguageModel | undefined;
  readonly prompt: string | undefined;
  systemPrompt: string | undefined;
  instructions: string[] | undefined;
  readonly chatStore: ChatStore;
  tools: ToolSet | undefined;
};

export const ModelSelectSchema = z.object({
  provider: z.string(),
  id: z.string(),
});

export const ModelsResultSchema = z.array(ModelSelectSchema);

export type ModelSelect = z.infer<typeof ModelSelectSchema>;
