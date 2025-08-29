import { Box, Text } from "ink";
import { useChatContext, useModelContext } from "../contexts";

export const StatusBar: React.FC = () => {
  const { modelInfo } = useModelContext();
  const { chatStatus } = useChatContext();

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>{modelInfo}</Text>
      <Text>{chatStatus}</Text>
    </Box>
  );
};
