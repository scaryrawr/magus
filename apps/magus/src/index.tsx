import { Box, Text, render, useApp, useStdout } from "ink";
import { useCallback, useState } from "react";
import { DefaultChatTransport } from "ai";
import TextInput from "ink-text-input";
import { createLmStudioProvider } from "@magus/providers";
import { createServer } from "@magus/server";
import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@magus/ink-ext";

type ChatProps = {
  baseUrl: string;
  onExit: () => void;
};

const Chat = ({ baseUrl, onExit }: ChatProps) => {
  const { exit } = useApp();
  const { sendMessage, messages } = useChat({
    transport: new DefaultChatTransport({
      api: `${baseUrl}api/chat`,
    }),
  });

  const [input, setInput] = useState("");
  const { stdout } = useStdout();

  const onSubmit = useCallback(
    (text: string) => {
      setInput("");

      if (text === "/exit") {
        onExit();
        exit();
        return;
      }

      if (text.trim()) {
        sendMessage({ text });
      }
    },
    [exit, onExit, sendMessage],
  );

  return (
    <Box flexDirection="column" width={stdout.columns} height={stdout.rows - 1}>
      <ScrollArea height={stdout.rows - 4}>
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
    </Box>
  );
};

const lmstudio = createLmStudioProvider();
const service = createServer({
  providers: [lmstudio],
  model: lmstudio.model("openai/gpt-oss-20b"),
});

const server = service.listen();

render(<Chat baseUrl={server.url.toString()} onExit={() => server.stop()} />);
