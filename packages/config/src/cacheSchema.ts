import { z } from "zod";

export const MagusCacheSchema = z.object({
  lastUsedModel: z.object({
    provider: z.string(),
    model: z.string(),
  }),
});

export type MagusCache = z.infer<typeof MagusCacheSchema>;
