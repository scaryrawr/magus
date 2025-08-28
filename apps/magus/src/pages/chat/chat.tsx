import { useChat } from "@ai-sdk/react";
import { ScrollArea } from "@magus/react";
import { DefaultChatTransport } from "ai";
import { useInput } from "ink";
import { useCallback, useEffect } from "react";
import { useLocation } from "react-router";
import { useChatContext, useInputContext, useRouteInput, useServerContext } from "../../contexts";
import { ChatBox } from "./chatbox";

type ChatState = {
  text?: string;
};

export const Chat = () => {
  const { server } = useServerContext();
  const { text: initialMessage } = useLocation().state as ChatState;
  const { setChatStatus } = useChatContext();
  const { sendMessage, messages, stop, status } = useChat({
    transport: new DefaultChatTransport({
      api: new URL("v0/chat", server.url).href,
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
