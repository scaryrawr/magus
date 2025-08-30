import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import type { MagusProvider } from "./types";

export const OpenRouterModelSchema = z.object({
  id: z.string(),
  context_length: z.nullable(z.number()),
  supported_parameters: z.array(z.string()),
});

export const OpenRouterModelsResponseSchema = z.object({
  data: z.array(OpenRouterModelSchema),
});

export const createOpenRouterProvider = (apiKey: string) => {
  const openrouter = createOpenAICompatible({
    name: "openrouter",
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
    headers: {
      "HTTP-Referer": "https://github.com/scaryrawr/magus",
      "X-Title": "magus",
    },
  });

  return {
    name: "openrouter",
    model: (id: string) => openrouter(id),
    models: async () => {
      const modelResponse = await fetch("https://openrouter.ai/api/v1/models");
      const models = OpenRouterModelsResponseSchema.parse(await modelResponse.json());
      return models.data.map((m) => ({
        id: m.id,
        context_length: m.context_length || 16385,
        reasoning: m.supported_parameters.includes("reasoning") || m.supported_parameters.includes("include_reasoning"),
        tool_use: m.supported_parameters.includes("tools") || m.supported_parameters.includes("tool_choice"),
      }));
    },
  } as const satisfies MagusProvider;
};
