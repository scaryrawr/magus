import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@magus/ink-ext";
import { DefaultChatTransport } from "ai";
import { Box, Text } from "ink";
import { useCallback } from "react";
import { useInputContext, useRouteInput, useServerContext } from "../contexts";

export const Chat = () => {
  const { server } = useServerContext();

  const { sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({
      api: `${server.url.toString()}/v0/chat`,
    }),
  });

  const { contentHeight } = useInputContext();

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
