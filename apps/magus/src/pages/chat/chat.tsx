import { useChat } from "@ai-sdk/react";
import { useStdoutDimensions } from "@magus/react";
import { type MagusChat, type MagusClient } from "@magus/server";
import { DefaultChatTransport, type ChatStatus } from "ai";
import { Box, Static, useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLoaderData, useParams, type RouteObject } from "react-router";
import { useServerContext, useSetChatId, useSetChatStatus, useStackedRouteInput } from "../../contexts";
import { useSafeLocation } from "../../hooks";
import { ChatBox } from "./chatbox";

type ChatState = {
  text: string | undefined;
};

const useUpdateChatStatus = (status: ChatStatus | undefined) => {
  const setChatStatus = useSetChatStatus();
  useEffect(() => {
    setChatStatus(status);
  }, [status, setChatStatus]);
};

export const Chat = () => {
  const { server, client } = useServerContext();
  const { chatId } = useParams();
  const { text: initialMessage } = useSafeLocation<ChatState>().state ?? {};
  const loadedChat = useLoaderData<MagusChat>();
  // Use summarized messages if available (for summarized chats), otherwise use full messages (for legacy chats)
  const initialMessages =
    loadedChat.summarized_messages && loadedChat.summarized_messages.length > 0
      ? loadedChat.summarized_messages
      : loadedChat.messages;
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
    async (text: string) => {
      if (!text.trim()) {
        return;
      }

      // Handle /summarize command
      if (text.trim() === "/summarize") {
        if (!chatId) {
          console.error("No chat ID available for summarization");
          return;
        }

        try {
          const res = await client.v0.chat[":chatId"].summarize.$post({
            param: { chatId },
          });

          if (!res.ok) {
            const errorText = await res.text();
            console.error("Failed to summarize chat:", errorText);
            // You could add a toast notification here if available
            return;
          }

          const result = await res.json();
          console.log("Chat summarized successfully:", result);
          // You could add a success notification here if available
        } catch (error) {
          console.error("Error calling summarization:", error);
        }
        return;
      }

      // Regular message sending
      void sendMessage({ text });
    },
    [sendMessage, client, chatId],
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
