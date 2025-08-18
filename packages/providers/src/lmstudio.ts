import type { MagusProvider } from "./types.js";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";

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

export const createLmStudioProvider = ({ origin = "http://localhost:1234" }: LmStudioOptions = {}): MagusProvider => {
  const lmstudio = createOpenAICompatible({
    name: "lmstudio",
    baseURL: `${origin}/v1`,
  });

  return {
    model: (id: string) => lmstudio(id),
    models: async () => {
      const response = await fetch(`${origin}/api/v0/models`);
      const data: LmStudioModelInfo = LmStudioModelInfoSchema.parse(await response.json());

      const models = data.data;
      return models
        .filter((m) => m.type !== "embeddings")
        .map((m) => ({
          context_length: m.max_context_length,
          id: m.id,
          reasoning: true,
          tool_use: m.capabilities?.includes("tool_use") ?? false,
        }));
    },
  };
};
