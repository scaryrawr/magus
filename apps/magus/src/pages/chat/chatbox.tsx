import { Markdown } from "@magus/react";
import { ToolView } from "@magus/react-tools";
import type { UIMessage } from "ai";
import { Box, Text } from "ink";
import { userInfo } from "node:os";

const getName = (role: "system" | "user" | "assistant") => {
  switch (role) {
    case "system":
      return "System";
    case "user":
      return userInfo().username || "User";
    case "assistant":
      return "Magus";
  }
};

export const ChatBox: React.FC<UIMessage> = ({ role, parts }) => {
  //const stderr = useStderr();
  return (
    <Box flexDirection="column" padding={1} borderColor={role === "user" ? "green" : "blue"}>
      <Text color={role === "user" ? "green" : "blue"} bold>
        {getName(role).toUpperCase()}
      </Text>
      {parts.map((part, index) => {
        if (part.type.startsWith("tool-")) {
          return <ToolView key={index} part={part} />;
        }
        switch (part.type) {
          case "text":
            return <Markdown key={index}>{part.text}</Markdown>;
          case "reasoning":
            return <Text dimColor>{part.text}</Text>;
          default:
            //stderr.write(`Undisplayed message part type: ${part.type}\n`);
            return null;
        }
      })}
    </Box>
  );
};
