import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@magus/ink-ext";
import { DefaultChatTransport } from "ai";
import { Box, Text, useInput } from "ink";
import { useCallback } from "react";
import { useNavigate } from "react-router";
import { useServer } from "../../contexts";
import { useInputContext, useRouteInput } from "../../contexts/InputProvider";

export const Chat = () => {
  const { server } = useServer();
  const navigate = useNavigate();

  const { sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({
      api: `${server.url.toString()}/v0/chat`,
    }),
  });

  const { contentHeight } = useInputContext();

  useInput((_input, key) => {
    if (key.escape) {
      navigate("/");
    }
  });

  const onSubmit = useCallback(
    (text: string) => {
      if (text === "/exit") {
        navigate("/exit");
        return;
      }

      if (text === "/home") {
        navigate("/");
        return;
      }

      if (text.trim()) {
        sendMessage({ text });
      }
    },
    [sendMessage, navigate],
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
