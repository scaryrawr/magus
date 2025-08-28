import type { LanguageModel } from "ai";
import { Box, Text } from "ink";
import { useEffect, useState } from "react";
import { useChatContext, useServerContext } from "../contexts";

const modelInfo = (model: LanguageModel | undefined) => {
  if (!model) {
    return "No model selected";
  }

  if (typeof model === "string") {
    return model;
  }

  return `${model.provider.replace(".chat", "")}:${model.modelId}`;
};

export const StatusBar: React.FC = () => {
  const { state } = useServerContext();
  const { chatStatus } = useChatContext();
  const [model, setModel] = useState<string | null>(() => modelInfo(state.model));

  useEffect(() => {
    const updateModel = (newModel: LanguageModel | undefined) => {
      setModel(modelInfo(newModel));
    };

    state.on("change:model", updateModel);
    return () => {
      state.off("change:model", updateModel);
    };
  }, [state]);

  return (
    <Box height={1} flexDirection="row" justifyContent="space-between">
      <Text dimColor>{model}</Text>
      <Text>{chatStatus}</Text>
    </Box>
  );
};
