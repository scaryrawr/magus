import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useModel, useServerContext } from "../contexts";
import { useChatId, useChatStatus, useChatUsage } from "../contexts/chatStore";

export const StatusBar: React.FC = () => {
  const chatStatus = useChatStatus();
  const chatId = useChatId();
  const { totalTokens } = useChatUsage(chatId) ?? { totalTokens: 0 };
  const { server } = useServerContext();
  const { currentModel, capabilities } = useModel();
  const url = server.url.href;

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>
        {currentModel?.provider || "unknown"}:{currentModel?.id || "unknown"}
      </Text>
      <Text dimColor>Server: {url}</Text>
      <Text dimColor>
        Tokens: {totalTokens} / {capabilities.contextLength || "unknown"}
      </Text>
      <Text dimColor>
        {chatStatus === "streaming" || chatStatus === "submitted" ? (
          <Text color={chatStatus === "streaming" ? "green" : "yellow"}>
            <Spinner type="dots" />
          </Text>
        ) : null}
        {chatStatus}
      </Text>
    </Box>
  );
};
