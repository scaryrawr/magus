import { Markdown } from "@magus/react";
import { ToolView } from "@magus/react-tools";
import type { UIMessage } from "ai";
import { Box, Text } from "ink";

const getName = (role: "system" | "user" | "assistant") => {
  switch (role) {
    case "system":
      return "System";
    case "user":
      return process.env.USER || "User";
    case "assistant":
      return "Magus";
  }
};

export const ChatBox: React.FC<UIMessage> = ({ role, parts }) => {
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
            return (
              <Text dimColor key={index}>
                {part.text}
              </Text>
            );
          default:
            //console.error(part.type);
            return null;
        }
      })}
    </Box>
  );
};
