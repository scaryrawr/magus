import {
  convertToModelMessages,
  createIdGenerator,
  createUIMessageStream,
  createUIMessageStreamResponse,
  streamText,
  type CoreMessage,
  type LanguageModelUsage,
  type UIMessage,
} from "ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { EventEmitter } from "node:events";
import type { ServerState } from "../types";
import type { RouterFactory } from "./types";

type ChatEvents = {
  usage: [id: string, usage: LanguageModelUsage];
  agentProgress: [id: string, data: { step: number; elapsedMs: number }];
};

// Helper to check if response messages contain tool calls
function hasToolCallsInMessages(messages: Array<{ role: string; content: unknown }>): boolean {
  return messages.some((msg) => {
    if (msg.role === "assistant") {
      const content = msg.content;
      if (Array.isArray(content)) {
        return content.some((part: { type: string }) => part.type === "tool-call");
      }
    }
    return false;
  });
}

export const chatRouter = (state: ServerState) => {
  const router = new Hono();
  const emitter = new EventEmitter<ChatEvents>();
  return router
    .post("/chat", async (c) => {
      if (!state.model) {
        return c.text("Please select a model first", 500);
      }

      const { message, id }: { message: UIMessage; id: string } = await c.req.json();
      const { messages: previousMessages, title } = (await state.chatStore.loadChat(id)) ?? { messages: [] };
      const tools = state.tools;

      const uiMessages = [...previousMessages, message];
      const abortController = new AbortController();

      // Manual agent loop configuration
      const startTime = Date.now();
      const generateMessageId = createIdGenerator({
        prefix: "msg",
        size: 16,
      });

      // Handle client disconnect
      c.req.raw.signal.addEventListener("abort", () => {
        abortController.abort();
      });

      // Create the UI message stream with manual agent loop
      const stream = createUIMessageStream({
        originalMessages: uiMessages,
        generateId: generateMessageId,
        execute: async ({ writer }) => {
          // Track message history across iterations
          let currentMessages: CoreMessage[] = convertToModelMessages(uiMessages);
          let stepCount = 0;

          try {
            while (true) {
              const elapsedMs = Date.now() - startTime;

              // Check abort signal (user interrupt or client disconnect)
              if (abortController.signal.aborted) {
                console.log("Agent loop stopped: aborted by client");
                break;
              }

              stepCount++;
              emitter.emit("agentProgress", id, { step: stepCount, elapsedMs });

              // Call streamText for a single step (using stopWhen to limit to 1 step)
              const result = streamText({
                messages: currentMessages,
                model: state.model!, // Already checked above
                tools,
                stopWhen: ({ steps }) => steps.length >= 1, // Single step at a time for manual control
                system: state.prompt,
                abortSignal: abortController.signal,
              });

              // Merge the result stream into the UI message stream
              const uiMessageStream = result.toUIMessageStream({
                originalMessages: uiMessages,
                generateMessageId,
              });
              writer.merge(uiMessageStream);

              // Wait for completion to get response messages and metadata
              const [response, usage, finishReason] = await Promise.all([
                result.response,
                result.usage,
                result.finishReason,
              ]);

              emitter.emit("usage", id, usage);

              // Add response messages to history for next iteration
              currentMessages = [...currentMessages, ...response.messages];

              // Check if we should continue (tool calls present)
              if (!hasToolCallsInMessages(response.messages) || finishReason !== "tool-calls") {
                console.log(
                  `Agent loop completed: no more tool calls (finish reason: ${finishReason}, steps: ${stepCount})`,
                );
                break;
              }
            }
          } catch (error) {
            console.error("Agent loop error:", error);
            throw error;
          }
        },
        onFinish: async ({ messages }) => {
          let newTitle = title;
          if (!newTitle) {
            const firstUserMessage = messages.find((m) => m.role === "user");
            if (firstUserMessage) {
              newTitle = firstUserMessage.parts.find((p) => p.type === "text")?.text.slice(0, 70);
            }
          }
          await state.chatStore.saveChat(id, { title: newTitle, messages });
        },
      });

      // Return the UI message stream as response
      return createUIMessageStreamResponse({
        stream,
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

        const onAgentProgress = (emittedId: string, data: { step: number; elapsedMs: number }) => {
          if (emittedId === chatId) {
            void stream.writeSSE({
              event: "agentProgress",
              data: JSON.stringify(data),
            });
          }
        };

        emitter.on("usage", onUsage);
        emitter.on("agentProgress", onAgentProgress);

        stream.onAbort(() => {
          emitter.off("usage", onUsage);
          emitter.off("agentProgress", onAgentProgress);
        });

        // Keep the connection alive
        while (true) {
          await stream.sleep(1000);
        }
      });
    });
};

chatRouter satisfies RouterFactory<ReturnType<typeof chatRouter>>;
