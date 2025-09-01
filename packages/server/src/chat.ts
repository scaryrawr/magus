import { type UIMessage, convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import type { RouterFactory, ServerState } from "./types";

export const chatRouter = (state: ServerState) => {
  const router = new Hono();
  return router
    .post("/chat", async (c) => {
      if (!state.model) {
        return c.text("Please select a model first", 500);
      }

      const { message, id }: { message: UIMessage; id: string } = await c.req.json();
      const { messages: previousMessages, title } = (await state.chatStore.loadChat(id)) ?? { messages: [] };
      const messages = [...previousMessages, message];

      const result = streamText({
        messages: convertToModelMessages(messages),
        model: state.model,
        tools: state.tools,
        stopWhen: async ({ steps }) => {
          // it's over 9000
          return steps.length > 9000;
        },
        system: state.systemPrompt,
      });
      return result.toUIMessageStreamResponse({
        originalMessages: messages,
        onFinish: async ({ messages }) => {
          let newTitle = title;
          if (!newTitle) {
            const firstUserMessage = messages.find((m) => m.role === "user");
            if (firstUserMessage) {
              newTitle = firstUserMessage.content.slice(0, 70);
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
