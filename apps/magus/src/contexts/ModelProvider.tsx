import type { LanguageModel } from "ai";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { useServerContext } from "./ServerProvider";

interface ModelContextValue {
  model: LanguageModel | undefined;
  provider: string | undefined;
  modelName: string | undefined;
  modelInfo: string;
  isLoading: boolean;
}

interface ModelProviderProps {
  children: ReactNode;
}

const ModelContext = createContext<ModelContextValue>({
  model: undefined,
  provider: undefined,
  modelName: undefined,
  modelInfo: "No model selected",
  isLoading: false,
});

const getModelInfo = (model: LanguageModel | undefined): string => {
  if (!model) {
    return "No model selected";
  }

  if (typeof model === "string") {
    return model;
  }

  return `${model.provider.replace(".chat", "")}:${model.modelId}`;
};

const getProvider = (model: LanguageModel | undefined): string | undefined => {
  if (!model || typeof model === "string") {
    return undefined;
  }

  return model.provider.replace(".chat", "");
};

const getModelName = (model: LanguageModel | undefined): string | undefined => {
  if (!model || typeof model === "string") {
    return undefined;
  }

  return model.modelId;
};

export const ModelProvider: React.FC<ModelProviderProps> = ({ children }) => {
  const { state: serverState } = useServerContext();
  const [model, setModel] = useState<LanguageModel | undefined>(() => serverState.model);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const handler = (newModel: LanguageModel | undefined) => {
      setModel(newModel);
      setIsLoading(false);
    };

    serverState.on("change:model", handler);
    return () => {
      serverState.off("change:model", handler);
    };
  }, [serverState]);

  const provider = getProvider(model);
  const modelName = getModelName(model);
  const modelInfo = getModelInfo(model);

  const contextValue: ModelContextValue = {
    model,
    provider,
    modelName,
    modelInfo,
    isLoading,
  };

  return <ModelContext.Provider value={contextValue}>{children}</ModelContext.Provider>;
};

export const useModelContext = (): ModelContextValue => {
  const context = useContext(ModelContext);
  if (!context) {
    throw new Error("useModelContext must be used within a ModelProvider");
  }
  return context;
};
