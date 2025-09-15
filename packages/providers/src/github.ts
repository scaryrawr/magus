import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import type { MagusProvider, ModelInfo } from "./types";

export const GitHubModelSchema = z.object({
  id: z.string(),
  model_picker_enabled: z.optional(z.boolean()),
  limits: z.optional(z.object({ max_context_window_tokens: z.number() })),
  supports: z.optional(
    z.object({
      tool_calls: z.boolean(),
      max_thinking_budget: z.optional(z.number()),
    }),
  ),
});

export const GitHubModelsResponseSchema = z.object({
  data: z.array(GitHubModelSchema),
});

type GitHubProviderOptions = {
  oauthToken: string;
  copilotToken: string;
};

export const createGitHubProvider = ({ oauthToken, copilotToken }: GitHubProviderOptions) => {
  const github = createOpenAICompatible({
    name: "github",
    apiKey: copilotToken,
    baseURL: "https://api.githubcopilot.com",
    headers: {
      "Editor-Version": "vscode/1.99.3",
      "Editor-Plugin-Version": "copilot-chat/0.26.7",
    },
  });

  let modelsCache: Promise<ModelInfo[]> | undefined;

  return {
    GitHub: {
      model: (id: string) => github(id),
      models: async () => {
        modelsCache ??= (async () => {
          const response = await fetch("https://api.githubcopilot.com/models", {
            headers: {
              Authorization: `Bearer ${oauthToken}`,
            },
          });

          const modelResponse = await response.json();
          const models = GitHubModelsResponseSchema.parse(modelResponse);
          return models.data
            .filter((m) => m.model_picker_enabled)
            .map(
              (m): ModelInfo => ({
                id: m.id,
                context_length: m.limits?.max_context_window_tokens || 128000,
                reasoning: Boolean(m.supports?.max_thinking_budget),
                tool_use: Boolean(m.supports?.tool_calls),
              }),
            );
        })();

        // Allow for retries.
        modelsCache?.catch(() => {
          modelsCache = undefined;
        });

        return modelsCache;
      },
    },
  } as const satisfies MagusProvider;
};
