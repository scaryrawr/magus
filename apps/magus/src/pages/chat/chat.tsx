import { useChat } from "@ai-sdk/react";
import type { MagusChat, MagusClient } from "@magus/server";
import { DefaultChatTransport, type ChatStatus } from "ai";
import { Box, Static, useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLoaderData, useParams, type RouteObject } from "react-router";
import { useChatStore, useServerContext, useStackedRouteInput } from "../../contexts";
import { useSafeLocation } from "../../hooks";
import { ChatBox } from "./chatbox";

type ChatState = {
  text: string | undefined;
};

const useUpdateChatStatus = (status: ChatStatus | undefined) => {
  const { setChatStatus } = useChatStore();
  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);
};

export const Chat = () => {
  const { server } = useServerContext();
  const chatId = useParams().chatId;
  const { text: initialMessage } = useSafeLocation<ChatState>().state ?? {};
  const { messages: initialMessages } = useLoaderData<MagusChat>();
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

  useUpdateChatStatus(status);

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

  const streaming = status === "streaming" || status === "submitted";
  const staticMessages = streaming && messages.length > 0 ? messages.slice(0, -1) : messages;
  const dynamicMessage = streaming && messages.length > 0 ? messages[messages.length - 1] : undefined;

  return (
    <Box width="100%">
      <Static items={staticMessages} style={{ width: "90%" }}>
        {(m) => <ChatBox key={m.id || `${m.role}:${m.parts.length}`} {...m} />}
      </Static>
      {dynamicMessage ? (
        <ChatBox key={dynamicMessage.id || `dynamic:${dynamicMessage.role}`} {...dynamicMessage} />
      ) : null}
    </Box>
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
