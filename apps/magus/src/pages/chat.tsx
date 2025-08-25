import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@magus/react";
import { DefaultChatTransport } from "ai";
import { Box, Text, useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import { useInputContext, useRouteInput, useServerContext } from "../contexts";

type ChatState = {
  text?: string;
};

export const Chat = () => {
  const { server } = useServerContext();
  const { text: initialMessage } = useLocation().state as ChatState;
  const { sendMessage, messages, stop } = useChat({
    transport: new DefaultChatTransport({
      api: new URL("v0/chat", server.url).href,
    }),
  });

  useEffect(() => {
    if (initialMessage) {
      sendMessage({ text: initialMessage });
    }
  }, [initialMessage, sendMessage]);

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
        <Box key={message.id}>
          <Text>{message.role === "user" ? "You" : "AI"}: </Text>
          {message.parts.map((part, index) => (part.type === "text" ? <Text key={index}>{part.text}</Text> : null))}
        </Box>
      ))}
    </ScrollArea>
  );
};
