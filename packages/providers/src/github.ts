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

export class TokenManager {
  private cachedToken: CopilotToken | undefined;
  constructor(private oauthToken: string) {}
  getToken = async () => {
    // If there's no cached token, or the cached token will expire within the next 5 minutes,
    // obtain a fresh Copilot token. We add a 5-minute (5 * 60 * 1000 ms) buffer to avoid
    // using a token that might expire mid-request or during long-running operations.
    // Note: expires_at is provided in seconds so we multiply by 1000 to compare with Date.now().
    if (!this.cachedToken || this.cachedToken.expires_at * 1000 < Date.now() + 5 * 60 * 1000) {
      this.cachedToken = await this.getCopilotToken(this.oauthToken);
    }

    return this.cachedToken.token;
  };

  getCopilotToken = async (oauthToken: string) => {
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
}

export const createGitHubProvider = ({ oauthToken }: GitHubProviderOptions) => {
  const tokenManager = new TokenManager(oauthToken);

  const github = createOpenAICompatible({
    name: "github",
    baseURL: "https://api.githubcopilot.com",
    fetch: (async (input, init) => {
      return fetch(input, {
        ...init,
        headers: {
          Authorization: `Bearer ${await tokenManager.getToken()}`,
          ...(init?.headers || {}),
        },
      });
    }) as typeof fetch,
    headers: {
      "Editor-Version": "vscode/1.99.3",
      "Editor-Plugin-Version": "copilot-chat/0.26.7",
    },
  });

  let modelsCache: Promise<ModelInfo[]> | undefined;

  return {
    github: {
      model: (id: string) => {
        return github(id);
      },
      models: async () => {
        modelsCache ??= (async () => {
          // Cache token should be refreshed by the refresh loop above
          const response = await fetch("https://api.githubcopilot.com/models", {
            headers: {
              Authorization: `Bearer ${await tokenManager.getToken()}`,
              "Editor-Version": "vscode/1.99.3",
              "Editor-Plugin-Version": "copilot-chat/0.26.7",
            },
          });

          const modelResponse = await response.json();
          const models = GitHubModelsResponseSchema.parse(modelResponse);
          return models.data
            .filter((m) => m.model_picker_enabled)
            .map(
              (m): ModelInfo =>
                ({
                  id: m.id,
                  context_length: m.limits?.max_context_window_tokens || 128000,
                  reasoning: Boolean(m.supports?.max_thinking_budget),
                  tool_use: Boolean(m.supports?.tool_calls),
                  provider: "github" as const,
                }) satisfies ModelInfo,
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
