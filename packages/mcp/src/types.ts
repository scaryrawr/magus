import z from "zod";

export const VscMcpServerSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("sse"),
    url: z.url(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
  z.object({
    type: z.literal("stdio"),
    command: z.string(),
    args: z.array(z.string()).optional(),
    env: z.record(z.string(), z.string()).optional(),
    envFile: z.string().optional(),
  }),
  z.object({
    type: z.literal("http"),
    url: z.url(),
    headers: z.record(z.string(), z.string()).optional(),
  }),
]);

export const VscMcpSchema = z.object({
  servers: z.record(z.string(), VscMcpServerSchema).optional(),
  inputs: z.array(z.unknown()).optional(),
});

export type VscMcp = z.infer<typeof VscMcpSchema>;
export type VscMcpServer = z.infer<typeof VscMcpServerSchema>;
