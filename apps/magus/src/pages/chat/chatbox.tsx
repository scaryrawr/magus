import type { UIMessage } from "ai";
import { Box, Text } from "ink";

export const ChatBox: React.FC<UIMessage> = ({ role, parts }) => {
  return (
    <Box
      flexDirection="column"
      padding={1}
      borderStyle="round"
      borderColor={role === "user" ? "green" : "blue"}
      marginBottom={1}
    >
      <Text color={role === "user" ? "green" : "blue"} bold>
        {role.toUpperCase()}
      </Text>
      {parts.map((part, index) => {
        switch (part.type) {
          case "text":
            return <Text key={index}>{part.text}</Text>;
          default:
            return null;
        }
      })}
    </Box>
  );
};
