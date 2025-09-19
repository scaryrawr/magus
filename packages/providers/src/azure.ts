import { createAzure } from "@ai-sdk/azure";
import { CognitiveServicesManagementClient } from "@azure/arm-cognitiveservices";
import { AzureCliCredential } from "@azure/identity";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import type { MagusProvider, ModelInfo } from "./types";

type AzureProviderOptions = {
  resourceGroup: string;
  subscription: string;
  name: string;
};

export const createAzureProvider = ({ resourceGroup, subscription, name }: AzureProviderOptions) => {
  const client = new CognitiveServicesManagementClient(
    new AzureCliCredential({
      subscription,
    }),
    subscription,
  );

  let azure: ReturnType<typeof createAzure> | undefined;
  client.accounts
    .listKeys(resourceGroup, name)
    .then((keys) => {
      if (!keys.key1 && !keys.key2) throw new Error("No API keys found for the Azure Cognitive Services account.");

      azure = createAzure({
        resourceName: name,
        apiKey: keys.key1 ?? keys.key2,
      });
    })
    .catch((err) => {
      console.error("Failed to retrieve Azure Cognitive Services account keys:", err);
    });

  let modelsCache: Promise<ModelInfo[]> | undefined;

  return {
    azure: {
      model: (id: string) => {
        if (!azure) throw new Error("Azure provider is not initialized yet. Please try again later.");

        // Many thinking models use the <think>...</think> tag to indicate reasoning steps.
        return wrapLanguageModel({
          model: azure(id),
          middleware: extractReasoningMiddleware({
            tagName: "think",
          }),
        });
      },
      models: () => {
        modelsCache ??= (async () => {
          const results = client.deployments.list(resourceGroup, name);
          const models: ModelInfo[] = [];
          for await (const item of results) {
            if (!item.name) continue;
            models.push({
              id: item.name,
              // Not the real context length, but eh... it'll stop working once we hit it.
              context_length: item.properties?.rateLimits?.find((limit) => limit.key === "token")?.count,
              provider: "azure" as const,
            } satisfies ModelInfo);
          }

          return models;
        })();

        modelsCache.catch(() => {
          modelsCache = undefined;
        });

        return modelsCache;
      },
    },
  } as const satisfies MagusProvider;
};
