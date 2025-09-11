import { useChat } from "@ai-sdk/react";
import type { MagusChat, MagusClient } from "@magus/server";
import { DefaultChatTransport } from "ai";
import { useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLoaderData, useParams, type RouteObject } from "react-router";
import { useChatStore, useServerContext, useStackedRouteInput } from "../../contexts";
import { useSafeLocation } from "../../hooks";
import { ChatBox } from "./chatbox";

type ChatState = {
  text: string | undefined;
};

export const Chat = () => {
  const { server } = useServerContext();
  const chatId = useParams().chatId;
  const { text: initialMessage } = useSafeLocation<ChatState>().state ?? {};
  const { messages: initialMessages } = useLoaderData<MagusChat>();
  const { setChatStatus } = useChatStore();
  const { sendMessage, messages, stop, status } = useChat({
    id: chatId,
    messages: initialMessages,
    transport: new DefaultChatTransport({
      api: new URL("v0/chat", server.url).href,
      prepareSendMessagesRequest({ messages, id }) {
        return { body: { message: messages[messages.length - 1], id } };
      },
    }),
  });

  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);

  useEffect(() => {
    if (initialMessage && messages.length === 0) {
      void sendMessage({ text: initialMessage });
    }
  }, [initialMessage, messages.length, sendMessage]);

  useInput((_, key) => {
    if (key.escape) {
      void stop();
    }
  });

  const onSubmit = useCallback(
    (text: string) => {
      if (text.trim()) {
        void sendMessage({ text });
      }
    },
    [sendMessage],
  );

  useStackedRouteInput({ onSubmit, placeholder: "Send a message..." });

  return (
    <>
      {messages.map((message, i) => {
        return <ChatBox key={message.id || `${i}:${message.role}`} {...message} />;
      })}
    </>
  );
};

export const createChatRoute = (client: MagusClient) => {
  return {
    path: ":chatId",
    Component: Chat,
    loader: async ({ params }): Promise<MagusChat> => {
      const chatId = params.chatId;
      if (!chatId) {
        throw new Error("chatId is required");
      }

      const res = await client.v0.chat.load[":chatId"].$get({
        param: { chatId },
      });

      if (!res.ok) {
        throw new Error(`Failed to load chat: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as MagusChat;
    },
  } as const satisfies RouteObject;
};
