import { useChat } from "@ai-sdk/react";
import { ScrollArea, useStdoutDimensions } from "@magus/ink-ext";
import { DefaultChatTransport } from "ai";
import { Box, Text, useInput } from "ink";
import TextInput from "ink-text-input";
import { useCallback, useState } from "react";
import { useNavigate } from "react-router";
import { useServer } from "../contexts";

export const Chat = () => {
  const { server } = useServer();
  const navigate = useNavigate();
  const dimensions = useStdoutDimensions();

  const { sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({
      api: `${server.url.toString()}/v0/chat`,
    }),
  });

  const [input, setInput] = useState("");

  useInput((_input, key) => {
    if (key.escape) {
      navigate("/");
    }
  });

  const onSubmit = useCallback(
    (text: string) => {
      setInput("");

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

  return (
    <Box flexDirection="column" width={dimensions.columns} height={dimensions.rows - 1}>
      <ScrollArea height={dimensions.rows - 4}>
        {messages.map((message) => (
          <Box key={message.id}>
            <Text>{message.role === "user" ? "You" : "AI"}: </Text>
            {message.parts.map((part, index) => (part.type === "text" ? <Text key={index}>{part.text}</Text> : null))}
          </Box>
        ))}
      </ScrollArea>
      <Box borderStyle="round" height={3}>
        <Text>Input: </Text>
        <TextInput value={input} onChange={setInput} onSubmit={onSubmit} />
      </Box>
      <Text dimColor>ESC: Home | /exit: Quit | /home: Home</Text>
    </Box>
  );
};
