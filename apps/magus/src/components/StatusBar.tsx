import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useModelInfo, useServerContext } from "../contexts";
import { useChatId, useChatStatus, useChatUsage } from "../contexts/chatStore";

export const StatusBar: React.FC = () => {
  const chatStatus = useChatStatus();
  const chatId = useChatId();
  const { totalTokens } = useChatUsage(chatId) ?? { totalTokens: 0 };
  const { server } = useServerContext();
  const modelInfo = useModelInfo();
  const url = server.url.href;

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>
        {modelInfo.provider}:{modelInfo.id}
      </Text>
      <Text dimColor>Server: {url}</Text>
      <Text dimColor>
        Tokens: {totalTokens} / {modelInfo.context_length}
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
