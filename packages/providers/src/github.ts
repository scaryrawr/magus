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
};

const CopilotTokenSchema = z.object({
  token: z.string(),
  refresh_in: z.number(),
  expires_at: z.number(),
});

type CopilotToken = z.infer<typeof CopilotTokenSchema>;

const getCopilotToken = async (oauthToken: string) => {
  const resp = await fetch("https://api.github.com/copilot_internal/v2/token", {
    headers: {
      Authorization: `Bearer ${oauthToken}`,
    },
  });

  if (!resp.ok) {
    throw new Error(`Failed to fetch GitHub Copilot token: ${resp.status} ${resp.statusText}`);
  }

  const data = await resp.json();
  return CopilotTokenSchema.parse(data);
};

export const createGitHubProvider = ({ oauthToken }: GitHubProviderOptions) => {
  let github: ReturnType<typeof createOpenAICompatible> | undefined;
  let timeout: NodeJS.Timeout | undefined;
  const onTokenRefresh = (copilotToken: CopilotToken) => {
    github = createOpenAICompatible({
      name: "github",
      apiKey: copilotToken.token,
      baseURL: "https://api.githubcopilot.com",
      headers: {
        "Editor-Version": "vscode/1.99.3",
        "Editor-Plugin-Version": "copilot-chat/0.26.7",
      },
    });

    if (timeout) {
      clearTimeout(timeout);
      timeout = undefined;
    }

    const refreshInMs = (copilotToken.refresh_in - 5 * 60) * 1000; // Refresh 5 minutes before expiry
    if (refreshInMs <= 0) {
      console.error("GitHub Copilot token refresh time is too short, not scheduling refresh.");
      return;
    }

    timeout = setTimeout(() => {
      getCopilotToken(oauthToken)
        .then(onTokenRefresh)
        .catch((err) => {
          console.error("Error refreshing GitHub Copilot token:", err);
        });
    }, refreshInMs);
  };

  getCopilotToken(oauthToken)
    .then(onTokenRefresh)
    .catch((err) => {
      console.error("Error fetching initial GitHub Copilot token:", err);
    });

  let modelsCache: Promise<ModelInfo[]> | undefined;

  return {
    GitHub: {
      model: (id: string) => {
        if (!github) {
          throw new Error("GitHub provider not initialized yet");
        }

        return github(id);
      },
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
