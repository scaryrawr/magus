import { type UIMessage, convertToModelMessages, createIdGenerator, streamText } from "ai";
import { Hono } from "hono";
import type { RouterFactory } from "./server";
import type { ServerState } from "./types";

export const chatRouter = (state: ServerState) => {
  const router = new Hono();
  return router
    .post("/chat", async (c) => {
      if (!state.model) {
        return c.text("Please select a model first", 500);
      }

      const { message, id }: { message: UIMessage; id: string } = await c.req.json();
      const { messages: previousMessages, title } = (await state.chatStore.loadChat(id)) ?? { messages: [] };
      const tools = state.tools;
      // const validMessages: UIMessage[] = tools
      //   ? await validateUIMessages({
      //       messages: previousMessages,
      //       tools: tools as Parameters<typeof validateUIMessages>[0]["tools"],
      //     })
      //   : previousMessages;

      // const messages = [...validMessages, message];
      const messages = [...previousMessages, message];
      const result = streamText({
        messages: convertToModelMessages(messages),
        model: state.model,
        tools,
        stopWhen: ({ steps }) => steps.length > 9000,
        system: state.systemPrompt,
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
    .get("/chat/load/:chatId", async (c) => {
      const chatId = c.req.param("chatId");
      const chat = await state.chatStore.loadChat(chatId);
      if (!chat) {
        return c.text("Chat not found", 404);
      }

      return c.json(chat);
    });
};

chatRouter satisfies RouterFactory<ReturnType<typeof chatRouter>>;
