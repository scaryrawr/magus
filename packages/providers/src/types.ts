import type { LanguageModel } from "ai";
import { z } from "zod";

export const ModelInfoSchema = z.object({
  id: z.string(),
  reasoning: z.boolean().optional(),
  context_length: z.number().optional(),
  tool_use: z.boolean().optional(),
});

export type ModelInfo = z.infer<typeof ModelInfoSchema>;

export type MagusProvider = Record<
  string,
  {
    model(id: string): LanguageModel;
    models(): Promise<ModelInfo[]>;
  }
>;
