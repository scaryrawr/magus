import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { z } from "zod";
import type { MagusProvider, ModelInfo } from "./types";

/** Schema for parsing /api/tags */
export const OllamaTagsSchema = z.object({
  models: z.array(
    z.object({
      details: z.object({
        families: z.array(z.string()),
        family: z.string(),
        format: z.string(),
        parameter_size: z.string(),
        parent_model: z.string(),
        quantization_level: z.string(),
      }),
      digest: z.string(),
      model: z.string(),
      modified_at: z.union([z.string(), z.date()]).transform((v) => (v instanceof Date ? v : new Date(v))),
      name: z.string(),
      size: z.number(),
    }),
  ),
});

export type OllamaTags = z.infer<typeof OllamaTagsSchema>;

/** Schema for parsing /api/show */
export const OllamaShowSchema = z.object({
  capabilities: z.array(z.string()),
  details: z.object({
    families: z.array(z.string()),
    family: z.string(),
    format: z.string(),
    parameter_size: z.string(),
    parent_model: z.string(),
    quantization_level: z.string(),
  }),
  license: z.string(),
  model_info: z
    .object({
      "general.architecture": z.string(),
    })
    .and(z.record(z.string(), z.any()))
    .superRefine((obj, ctx) => {
      for (const [key, value] of Object.entries(obj)) {
        if (key.endsWith(".context_length") && typeof value !== "number") {
          ctx.addIssue({
            code: "custom",
            message: `Expected a number for ${key}, but got ${typeof value}`,
          });
        }
      }
    }),
  modelfile: z.string(),
  modified_at: z.string(),
  parameters: z.optional(z.string()),
  template: z.string(),
  tensors: z.optional(
    z.array(
      z.object({
        name: z.string(),
        shape: z.array(z.number()),
        type: z.string(),
      }),
    ),
  ),
});

type OllamaShow = z.infer<typeof OllamaShowSchema>;

export interface OllamaOptions {
  origin?: string;
}

// Default to some "reasonable" minimal context length
const DEFAULT_CONTEXT_LENGTH = 4096;

export const createOllamaProvider = ({ origin = "http://localhost:11434" }: OllamaOptions = {}) => {
  const ollama = createOpenAICompatible({
    baseURL: `${origin}/v1`,
    name: "ollama",
  });

  return {
    ollama: {
      model: (id: string) => ollama(id),
      models: async (): Promise<ModelInfo[]> => {
        const response = await fetch(`${origin}/api/tags`);
        const data: OllamaTags = OllamaTagsSchema.parse(await response.json());
        return Promise.all(
          data.models.map<Promise<ModelInfo>>(async (m) => {
            const modelResponse = await fetch(`${origin}/api/show`, {
              body: JSON.stringify({ model: m.model }),
              headers: { "Content-Type": "application/json" },
              method: "POST",
            });

            const raw = await modelResponse.json();
            const info: OllamaShow = OllamaShowSchema.parse(raw);
            const contextKey = `${info.model_info["general.architecture"]}.context_length` as const;
            const contextLength =
              typeof info.model_info[contextKey] === "number" ? info.model_info[contextKey] : DEFAULT_CONTEXT_LENGTH;

            return {
              context_length: contextLength,
              id: m.model,
              reasoning: info.capabilities.includes("thinking"),
              tool_use: info.capabilities.includes("tools"),
            } satisfies ModelInfo;
          }),
        );
      },
    },
  } as const satisfies MagusProvider;
};

export default createOllamaProvider;
