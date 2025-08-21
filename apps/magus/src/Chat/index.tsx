import { Box, Text, useInput } from "ink";
import { useCallback, useState } from "react";
import { DefaultChatTransport } from "ai";
import TextInput from "ink-text-input";
import { useChat } from "@ai-sdk/react";
import { ScrollArea, useStdoutDimensions } from "@magus/ink-ext";
import { useServer } from "../contexts";
import { useNavigate } from "react-router";

interface ChatProps {
  onExit: () => void;
}

export const Chat: React.FC<ChatProps> = ({ onExit }) => {
  const { server } = useServer();
  const navigate = useNavigate();
  const dimensions = useStdoutDimensions();

  const { sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({
      api: `${server.url.toString()}/v0/chat`,
    }),
  });

  const [input, setInput] = useState("");

  useInput((inputChar, key) => {
    if (key.escape) {
      navigate("/");
    }
  });

  const onSubmit = useCallback(
    (text: string) => {
      setInput("");

      if (text === "/exit") {
        onExit();
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
    [onExit, sendMessage, navigate],
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
