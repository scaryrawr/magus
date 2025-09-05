import type { LanguageModel } from "ai";
import type { ModelSelect } from "../types";

export const langueModelToModelSelect = (model: LanguageModel | undefined): ModelSelect | undefined => {
  if (!model || typeof model === "string") {
    return undefined;
  }

  return {
    provider: model.provider.replace(".chat", ""),
    id: model.modelId,
  };
};
