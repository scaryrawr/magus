import { z } from "zod";

// Placeholder schema for configuration data
export const MagusConfigSchema = z.object({});
export type MagusConfig = z.infer<typeof MagusConfigSchema>;
