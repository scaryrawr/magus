import { z } from "zod";

// Placeholder schema for data items
export const MagusDataSchema = z.object({});
export type MagusData = z.infer<typeof MagusDataSchema>;
