import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@magus/react";
import type { MagusChat, MagusClient } from "@magus/server";
import { DefaultChatTransport } from "ai";
import { useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLoaderData, useLocation, useParams, type RouteObject } from "react-router";
import { useChatContext, useInputContext, useRouteInput, useServerContext } from "../../contexts";
import { ChatBox } from "./chatbox";

type ChatState = {
  text: string | undefined;
};

export const Chat = () => {
  const { server } = useServerContext();
  const chatId = useParams().chatId;
  const { text: initialMessage } = (useLocation().state as ChatState | undefined) ?? {};
  const { messages: initialMessages } = useLoaderData<MagusChat>();
  const { setChatStatus } = useChatContext();
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
      sendMessage({ text: initialMessage });
    }
  }, [initialMessage, messages.length, sendMessage]);

  const { contentHeight } = useInputContext();

  useInput((_, key) => {
    if (key.escape) {
      stop();
    }
  });

  const onSubmit = useCallback(
    (text: string) => {
      if (text.trim()) {
        sendMessage({ text });
      }
    },
    [sendMessage],
  );

  useRouteInput({ onSubmit, placeholder: "Send a message..." });

  return (
    <ScrollArea width="100%" height={contentHeight}>
      {messages.map((message) => (
        <ChatBox key={message.id} {...message} />
      ))}
    </ScrollArea>
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

      return await res.json();
    },
  } as const satisfies RouteObject;
};
