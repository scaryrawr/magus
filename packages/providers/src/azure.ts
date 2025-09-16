import { createAzure } from "@ai-sdk/azure";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { z } from "zod";
import type { MagusProvider, ModelInfo } from "./types";

export const AzureModelSchema = z.object({
  id: z.string(),
});

export const AzureModelsResponseSchema = z.array(AzureModelSchema);

type AzureProviderOptions = {
  resourceGroup: string;
  subscription: string;
  name: string;
};

const AzureKeysSchema = z.object({
  key1: z.string(),
  key2: z.string(),
});

export const createAzureProvider = ({ resourceGroup, subscription, name }: AzureProviderOptions) => {
  const { key1 } = AzureKeysSchema.parse(
    JSON.parse(
      Bun.spawnSync([
        "az",
        "cognitiveservices",
        "account",
        "keys",
        "list",
        "--subscription",
        subscription,
        "--name",
        name,
        "--resource-group",
        resourceGroup,
      ])
        .stdout.toString()
        .trim(),
    ),
  );

  const azure = createAzure({
    resourceName: name,
    apiKey: key1,
  });

  let modelsCache: ModelInfo[] | undefined;

  return {
    Azure: {
      model: (id: string) => {
        // Many thinking models use the <think>...</think> tag to indicate reasoning steps.
        return wrapLanguageModel({
          model: azure(id),
          middleware: extractReasoningMiddleware({
            tagName: "think",
          }),
        });
      },
      models: () => {
        modelsCache ??= (() => {
          const output = Bun.spawnSync([
            "az",
            "cognitiveservices",
            "account",
            "deployment",
            "list",
            "--subscription",
            subscription,
            "--resource-group",
            resourceGroup,
            "--name",
            name,
            "--query",
            "[].{id:name}",
          ])
            .stdout.toString()
            .trim();

          const models = AzureModelsResponseSchema.parse(JSON.parse(output));
          return models.map((m) => ({
            id: m.id,
          }));
        })();

        return Promise.resolve(modelsCache);
      },
    },
  } as const satisfies MagusProvider;
};
