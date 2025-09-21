import type { MagusProvider } from "@magus/providers";
import type { LanguageModel, ToolSet, UIMessage } from "ai";
import z from "zod";

// ---------------- Summarization Types (v1) ----------------
// NOTE: These mirror the design in summarization-plan.md. They are colocated here
// to avoid circular deps for store/schema parsing.

export interface SummaryContext {
  participants?: string[];
  decisions?: string[];
  actionItems?: { owner?: string; task: string; due?: string }[];
  unresolved?: string[];
  domainEntities?: string[]; // filenames, classes, APIs, etc.
  raw?: unknown; // escape hatch
}

export interface SummaryRecord {
  id: string; // uuid
  timestamp: number; // ms
  depth: number; // 0 = first summarization
  parentId?: string;
  summary: string; // narrative paragraph(s)
  keyPoints: string[];
  context: SummaryContext;
  originalMessageIds: string[]; // IDs of messages compressed
  tokenEstimate?: number;
}

export interface SummarizationConfig {
  enabled: boolean;
  triggerTokenRatio: number; // ratio (0-1) at which summarization triggers
  resetTokenRatio: number; // lower ratio below which we allow a future trigger after one fired
  minMessages: number;
  preserveRecent: number; // tail messages kept verbatim
  maxSummaryChainDepth: number;
  forceRefreshAfterMessages?: number; // optional periodic refresh cadence
  summarizerModelPreference?: string[]; // ordered model IDs
  cooldownMessages: number; // min new messages after a summarization before re-check
  abortOnFailure: boolean; // if false, failure is silent and chat proceeds
}

export const DefaultSummarizationConfig: SummarizationConfig = {
  enabled: true,
  triggerTokenRatio: 0.8,
  resetTokenRatio: 0.7,
  minMessages: 12,
  preserveRecent: 6,
  maxSummaryChainDepth: 3,
  cooldownMessages: 4,
  abortOnFailure: false,
};

export const ChatUsageSchema = z.object({
  inputTokens: z.number(),
  outputTokens: z.number(),
  totalTokens: z.number(),
  reasoningTokens: z.number().optional(),
  cachedInputTokens: z.number().optional(),
});

// Summary history entry type
// Backwards compatibility: old ConversationSummary kept full messages. New SummaryRecord
// stores only IDs to reduce duplication. We still expose a union for legacy readers.
export type ConversationSummary =
  | SummaryRecord
  | {
      id: string;
      timestamp: number;
      summary: string;
      keyPoints: string[];
      context: Record<string, unknown>;
      originalMessages: UIMessage[]; // legacy shape
    };

export const MagusChatSchema = z.object({
  title: z.string().optional(),
  // messages use AI SDK structure, opaque to us
  messages: z.array(z.any()),
  summaryHistory: z
    .array(
      z.union([
        // New schema
        z.object({
          id: z.string(),
          timestamp: z.number(),
          depth: z.number(),
          parentId: z.string().optional(),
          summary: z.string(),
          keyPoints: z.array(z.string()),
          context: z.object({
            participants: z.array(z.string()).optional(),
            decisions: z.array(z.string()).optional(),
            actionItems: z
              .array(
                z.object({
                  owner: z.string().optional(),
                  task: z.string(),
                  due: z.string().optional(),
                }),
              )
              .optional(),
            unresolved: z.array(z.string()).optional(),
            domainEntities: z.array(z.string()).optional(),
            raw: z.any().optional(),
          }),
          originalMessageIds: z.array(z.string()),
          tokenEstimate: z.number().optional(),
        }),
        // Legacy schema
        z.object({
          id: z.string(),
          timestamp: z.number(),
          summary: z.string(),
          keyPoints: z.array(z.string()),
          context: z.record(z.string(), z.any()),
          originalMessages: z.array(z.any()),
        }),
      ]),
    )
    .optional(),
  lastSummarization: z
    .object({
      depth: z.number(),
      messageCount: z.number(),
      tokenRatio: z.number(),
    })
    .optional(),
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
  getSummaryHistory: (chatId: string) => Promise<ConversationSummary[]>;
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
