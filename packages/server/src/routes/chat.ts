import { type LanguageModelUsage, type UIMessage, convertToModelMessages, createIdGenerator, streamText } from "ai";
import { Elysia, t } from "elysia";
import { EventEmitter } from "node:events";
import type { ServerState } from "../types";

type ChatEvents = {
  usage: [id: string, usage: LanguageModelUsage];
};

export const chatRouter = (state: ServerState) => {
  const emitter = new EventEmitter<ChatEvents>();

  return new Elysia()
    .post(
      "/chat",
      async ({ body }) => {
        if (!state.model) {
          return new Response("Please select a model first", { status: 500 });
        }

        const id = body.id;
        const message = body.message as UIMessage;
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
      },
      {
        body: t.Object({
          message: t.Unknown(),
          id: t.String(),
        }),
      },
    )
    .get("/chats", async () => {
      const chats = await state.chatStore.getChats();
      return chats;
    })
    .post("/chat/new", async () => {
      const chatId = await state.chatStore.createChat();
      return { chatId };
    })
    .get("/chat/:chatId/load", async ({ params, set }) => {
      const chat = await state.chatStore.loadChat(params.chatId);
      if (!chat) {
        set.status = 404;
        return "Chat not found";
      }
      return chat;
    })
    .get("/chat/:chatId/sse", ({ params }) => {
      const chatId = params.chatId;
      let cleanup: (() => void) | undefined;

      return new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            const onUsage = (emittedId: string, usage: LanguageModelUsage) => {
              if (emittedId === chatId) {
                controller.enqueue(encoder.encode(`event: usage\ndata: ${JSON.stringify(usage)}\n\n`));
              }
            };

            emitter.on("usage", onUsage);

            // Keep-alive interval
            const keepAlive = setInterval(() => {
              controller.enqueue(encoder.encode(": keepalive\n\n"));
            }, 1000);

            cleanup = () => {
              emitter.off("usage", onUsage);
              clearInterval(keepAlive);
            };
          },
          cancel() {
            cleanup?.();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    });
};
