import { Box, Text } from "ink";
import Spinner from "ink-spinner";
import { useChatContext, useModelContext } from "../contexts";

export const StatusBar: React.FC = () => {
  const { modelInfo } = useModelContext();
  const { chatStatus } = useChatContext();

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>{modelInfo}</Text>
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
