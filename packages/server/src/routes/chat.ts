import { type LanguageModelUsage, type UIMessage, convertToModelMessages, createIdGenerator, streamText } from "ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { EventEmitter } from "node:events";
import { maybeTriggerSummarization } from "../services/summarizer";
import type { ConversationSummary, MagusChat, ServerState, SummarizationConfig, SummaryRecord } from "../types";
import type { RouterFactory } from "./types";

type ChatEvents = {
  usage: [id: string, usage: LanguageModelUsage];
};

// Basic token count heuristic (4 chars per token)
interface TextPart {
  type: "text";
  text: string;
}
const isTextPart = (p: unknown): p is TextPart =>
  typeof p === "object" &&
  !!p &&
  (p as { type?: string }).type === "text" &&
  typeof (p as { text?: unknown }).text === "string";
const estimateTokens = (messages: UIMessage[]): number => {
  let chars = 0;
  for (const m of messages) {
    if (!Array.isArray(m.parts)) continue;
    for (const p of m.parts) if (isTextPart(p)) chars += p.text.length;
  }
  return Math.ceil(chars / 4);
};

export const chatRouter = (state: ServerState) => {
  const router = new Hono();
  const emitter = new EventEmitter<ChatEvents>();
  return router
    .post("/chat", async (c) => {
      if (!state.model) {
        return c.text("Please select a model first", 500);
      }

      const { message, id }: { message: UIMessage; id: string } = await c.req.json();
      const {
        messages: previousMessages,
        title,
        summaryHistory,
        lastSummarization,
      } = (await state.chatStore.loadChat(id)) ?? ({ messages: [] } as MagusChat);
      const tools = state.tools;
      // Combine previous + new message
      const combined = [...previousMessages, message];

      // Prepare existing summary history (filter to new format SummaryRecord if present)
      const existingHistoryRaw: ConversationSummary[] = Array.isArray(summaryHistory) ? summaryHistory : [];
      const existingRecords: SummaryRecord[] = existingHistoryRaw.filter(
        (r): r is SummaryRecord => typeof r === "object" && !!r && "depth" in (r as Record<string, unknown>),
      );

      // Summarization config (could later be dynamic or loaded)
      const summarizationConfig: SummarizationConfig = {
        enabled: true,
        triggerTokenRatio: 0.8,
        resetTokenRatio: 0.7,
        minMessages: 12,
        preserveRecent: 6,
        maxSummaryChainDepth: 3,
        cooldownMessages: 4,
        abortOnFailure: false,
      };

      const contextLength = 9000; // Fallback context window size
      let messagesToUse = combined;
      let updatedSummaryHistory: SummaryRecord[] = existingRecords;
      let newLastSummarization = lastSummarization;

      try {
        const triggerResult = await maybeTriggerSummarization({
          allMessages: combined,
          newUserMessage: message,
          summarizationConfig,
          modelContextLength: contextLength,
          lastSummarization,
          summaryHistory: existingRecords,
          model: state.model ?? "", // empty string sentinel if undefined
        });
        if (triggerResult.summarized && triggerResult.summaryRecord) {
          messagesToUse = [...triggerResult.newMessages];
          updatedSummaryHistory = [...existingRecords, triggerResult.summaryRecord];
          const tokenEstimate = estimateTokens(combined);
          const ratio = tokenEstimate / contextLength;
          newLastSummarization = {
            depth: triggerResult.summaryRecord.depth,
            messageCount: combined.length,
            tokenRatio: ratio,
          };
        }
      } catch {
        // Fail open: summarization errors ignored per abortOnFailure=false
      }

      const result = streamText({
        messages: convertToModelMessages(messagesToUse),
        model: state.model,
        tools,
        system: state.prompt,
        stopWhen: ({ steps }) => steps.length > 9000,
        onStepFinish: ({ usage }) => {
          emitter.emit("usage", id, { ...usage });
        },
        onFinish: ({ totalUsage }) => {
          emitter.emit("usage", id, { ...totalUsage });
        },
      });

      return result.toUIMessageStreamResponse({
        originalMessages: messagesToUse,
        generateMessageId: createIdGenerator({
          prefix: "msg",
          size: 16,
        }),
        onFinish: async ({ messages }) => {
          let newTitle = title;
          if (!newTitle) {
            const firstUserMessage = messages.find((m) => m.role === "user");
            if (firstUserMessage) {
              newTitle = firstUserMessage.parts.find((p) => p.type === "text")?.text.slice(0, 70);
            }
          }
          const chatToSave: MagusChat = {
            title: newTitle,
            messages: messages,
            summaryHistory: updatedSummaryHistory,
            lastSummarization: newLastSummarization,
          } as MagusChat;
          await state.chatStore.saveChat(id, chatToSave);
        },
      });
    })
    .get("chats", async (c) => {
      const chats = await state.chatStore.getChats();
      return c.json(chats);
    })
    .post("/chat/new", async (c) => {
      const chatId = await state.chatStore.createChat();
      return c.json({ chatId });
    })
    .get("/chat/:chatId/load", async (c) => {
      const chatId = c.req.param("chatId");
      const chat = await state.chatStore.loadChat(chatId);
      if (!chat) {
        return c.text("Chat not found", 404);
      }

      return c.json(chat);
    })
    .get("/chat/:chatId/sse", (c) => {
      const chatId = c.req.param("chatId");
      return streamSSE(c, async (stream) => {
        const onUsage = (emittedId: string, usage: LanguageModelUsage) => {
          if (emittedId === chatId) {
            void stream.writeSSE({
              event: "usage",
              data: JSON.stringify(usage),
            });
          }
        };

        emitter.on("usage", onUsage);
        stream.onAbort(() => {
          emitter.off("usage", onUsage);
        });

        // Keep the connection alive
        while (true) {
          await stream.sleep(1000);
        }
      });
    });
};

chatRouter satisfies RouterFactory<ReturnType<typeof chatRouter>>;
