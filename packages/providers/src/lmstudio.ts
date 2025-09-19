import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { extractReasoningMiddleware, wrapLanguageModel } from "ai";
import { z } from "zod";
import type { MagusProvider, ModelInfo } from "./types";

export const LmStudioModelInfoSchema = z.object({
  object: z.literal("list"),
  data: z.array(
    z.object({
      id: z.string(),
      type: z.enum(["llm", "vlm", "embeddings"]),
      max_context_length: z.number(),
      capabilities: z.optional(z.array(z.string())),
    }),
  ),
});

type LmStudioModelInfo = z.infer<typeof LmStudioModelInfoSchema>;

export interface LmStudioOptions {
  origin?: string;
}

export const createLmStudioProvider = ({ origin = "http://localhost:1234" }: LmStudioOptions = {}) => {
  const lmstudio = createOpenAICompatible({
    name: "lmstudio",
    baseURL: `${origin}/v1`,
  });

  return {
    lmstudio: {
      model: (id: string) => {
        // Many thinking models use the <think>...</think> tag to indicate reasoning steps.
        return wrapLanguageModel({
          model: lmstudio(id),
          middleware: [
            extractReasoningMiddleware({
              tagName: "think",
            }),
            extractReasoningMiddleware({
              tagName: "seed:think",
            }),
          ],
        });
      },
      models: async () => {
        const response = await fetch(`${origin}/api/v0/models`);
        if (!response.ok) {
          throw new Error(`Failed to fetch LM Studio models: ${response.status} ${response.statusText}`);
        }

        const data: LmStudioModelInfo = LmStudioModelInfoSchema.parse(await response.json());

        const models = data.data;
        return models
          .filter((m) => m.type !== "embeddings")
          .map(
            (m) =>
              ({
                context_length: m.max_context_length,
                id: m.id,
                reasoning: true,
                tool_use: m.capabilities?.includes("tool_use") ?? false,
                provider: "lmstudio" as const,
              }) satisfies ModelInfo,
          );
      },
    },
  } as const satisfies MagusProvider;
};
