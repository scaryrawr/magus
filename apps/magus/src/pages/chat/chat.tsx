import { useChat } from "@ai-sdk/react";
import { useStdoutDimensions } from "@magus/react";
import { type MagusChat, type MagusClient } from "@magus/server";
import { DefaultChatTransport, type ChatStatus } from "ai";
import { Box, Static, useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLoaderData, useParams, type RouteObject } from "react-router";
import { useChatStore, useServerContext, useSetChatId, useStackedRouteInput } from "../../contexts";
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
  const { chatId } = useParams();
  const { text: initialMessage } = useSafeLocation<ChatState>().state ?? {};
  const { messages: initialMessages } = useLoaderData<MagusChat>();
  //const { totalTokens } = useChatUsage(chatId) ?? {};
  const setChatId = useSetChatId();

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
    if (!chatId) return;
    setChatId(chatId);
    return () => {
      setChatId(undefined);
    };
  }, [chatId, setChatId]);

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
  const { columns } = useStdoutDimensions();
  return (
    <Box width="100%">
      {/* Key Static by width so that on terminal resize it remounts and reflows once without flickering every frame */}
      <Static key={columns} items={staticMessages} style={{ width: "90%" }}>
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

      const res = await client.v0.chat[":chatId"].load.$get({
        param: { chatId },
      });

      if (!res.ok) {
        throw new Error(`Failed to load chat: ${res.status} ${res.statusText}`);
      }

      return (await res.json()) as MagusChat;
    },
  } as const satisfies RouteObject;
};
