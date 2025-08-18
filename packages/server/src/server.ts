import { type LanguageModel, type UIMessage, convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import { serve } from "@hono/node-server";
import type { MagusProvider } from "@magus/providers";

export interface ServerState {
  providers: readonly MagusProvider[];
  model: LanguageModel;
}

export const createServer = (initialState: ServerState) => {
  const app = new Hono();
  const state: ServerState = { ...initialState };

  app.post("/api/chat", async (c) => {
    const { messages }: { messages: UIMessage[] } = await c.req.json();
    const result = streamText({
      messages: convertToModelMessages(messages),
      model: state.model,
    });
    return result.toUIMessageStreamResponse();
  });

  return {
    listen: () => {
      const server = serve({
        port: 0,
        fetch: app.fetch,
      });

      const address = server.address();
      if (address === null) {
        throw new Error("Could not create server");
      }

      if (typeof address !== "object") {
        throw new Error("Unexpected server address");
      }

      const port = address.port;
      const url = new URL(`http://localhost:${port}`);

      return {
        url,
        stop: () => server.close(),
      };
    },
  };
};
