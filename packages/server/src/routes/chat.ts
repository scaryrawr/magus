import {
  type LanguageModelUsage,
  type UIMessage,
  convertToModelMessages,
  createIdGenerator,
  generateObject,
  streamText,
} from "ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { EventEmitter } from "node:events";
import { z } from "zod";
import type { MagusChat, ServerState } from "../types";
import type { RouterFactory } from "./types";

type ChatEvents = {
  usage: [id: string, usage: LanguageModelUsage];
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
      const chat = (await state.chatStore.loadChat(id)) ?? { messages: [] };
      const { messages: previousMessages, summarized_messages, title } = chat;
      const tools = state.tools;

      // Use summarized messages if available, otherwise use full message history
      const contextMessages =
        summarized_messages && summarized_messages.length > 0 ? summarized_messages : previousMessages;

      const messages = [...contextMessages, message];
      const result = streamText({
        messages: convertToModelMessages(messages),
        model: state.model,
        tools,
        stopWhen: ({ steps }) => steps.length > 9000,
        system: state.prompt,
        onStepFinish: ({ usage }) => {
          emitter.emit("usage", id, { ...usage });
        },
        onFinish: ({ totalUsage }) => {
          emitter.emit("usage", id, { ...totalUsage });
        },
      });

      return result.toUIMessageStreamResponse({
        originalMessages: messages,
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

          // If we're using summarized messages, we need to append new messages to the original full history
          // while keeping the summarized messages for future context
          const updatedChat =
            summarized_messages && summarized_messages.length > 0
              ? {
                  title: newTitle,
                  messages: [...previousMessages, ...messages.slice(contextMessages.length)], // Add only the new messages beyond context
                  summarized_messages,
                }
              : {
                  title: newTitle,
                  messages,
                };

          await state.chatStore.saveChat(id, updatedChat);
        },
      });
    })
    .post("/chat/:chatId/summarize", async (c) => {
      if (!state.model) {
        return c.text("Please select a model first", 500);
      }

      const chatId = c.req.param("chatId");
      let chat: MagusChat;
      try {
        chat = await state.chatStore.loadChat(chatId);
      } catch {
        return c.text("Chat not found", 404);
      }

      // Only summarize if there are enough messages to warrant it
      if (chat.messages.length < 10) {
        return c.text("Chat has too few messages to summarize", 400);
      }

      try {
        // Create a schema for the summary structure
        const SummarySchema = z.object({
          summary: z.string().describe("A concise summary of the conversation context and key topics discussed"),
          key_points: z
            .array(z.string())
            .describe("Important points, decisions, or information that should be retained"),
          context: z.string().describe("The current context or state of the conversation that should be maintained"),
        });

        // Generate a structured summary of the chat history
        const result = await generateObject({
          model: state.model,
          schema: SummarySchema,
          system:
            "You are an expert at summarizing conversations. Create a concise summary that preserves the essential context and information needed to continue the conversation meaningfully.",
          prompt: `Please summarize this conversation, preserving key context and information:

${chat.messages
  .map((msg, i) => {
    const messageText =
      msg.parts
        ?.map((p) => {
          if (p.type === "text" && "text" in p) {
            return p.text;
          }
          return `[${p.type}]`;
        })
        .join(" ") || "";
    return `${i + 1}. ${msg.role}: ${messageText}`;
  })
  .join("\n")}

Focus on:
- Main topics and themes discussed
- Key decisions or conclusions reached  
- Current state of any ongoing work or projects
- Important context needed to continue the conversation
- User preferences or requirements mentioned`,
        });

        // Create summarized messages that preserve the conversation flow
        const summarizedMessages: UIMessage[] = [
          {
            id: createIdGenerator({ prefix: "sum", size: 16 })(),
            role: "assistant",
            parts: [
              {
                type: "text",
                text: `## Conversation Summary

**Context:** ${result.object.context}

**Summary:** ${result.object.summary}

**Key Points:**
${result.object.key_points.map((point) => `• ${point}`).join("\n")}

---

This conversation has been summarized to preserve context while reducing token usage. You can continue our discussion from this point.`,
              },
            ],
          },
        ];

        // Save the chat with summarized messages, preserving original messages
        const updatedChat: MagusChat = {
          ...chat,
          summarized_messages: summarizedMessages,
        };

        await state.chatStore.saveChat(chatId, updatedChat);

        return c.json({
          success: true,
          summary: result.object,
          message: "Chat summarized successfully. You can continue the conversation with reduced context.",
        });
      } catch (error) {
        console.error("Summarization error:", error);
        return c.text("Failed to summarize chat", 500);
      }
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
      try {
        const chat = await state.chatStore.loadChat(chatId);
        return c.json(chat);
      } catch {
        return c.text("Chat not found", 404);
      }
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
