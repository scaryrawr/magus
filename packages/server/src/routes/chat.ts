import { type LanguageModelUsage, type UIMessage, convertToModelMessages, createIdGenerator, streamText } from "ai";
import { Hono } from "hono";
import { streamSSE } from "hono/streaming";
import { EventEmitter } from "node:events";
import type { ServerState } from "../types";
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
      const { messages: previousMessages, title } = (await state.chatStore.loadChat(id)) ?? { messages: [] };
      const tools = state.tools;

      const messages = [...previousMessages, message];
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
          await state.chatStore.saveChat(id, { title: newTitle, messages });
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
