import { type UIMessage, convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import type { EndpointRegistrar, RouterFactory } from "./types.js";

// New: Router factory for mounting under a base path
export const chatRouter: RouterFactory = (state) => {
  const router = new Hono();
  router.post("/chat", async (c) => {
    const { messages }: { messages: UIMessage[] } = await c.req.json();
    const result = streamText({
      messages: convertToModelMessages(messages),
      model: state.model,
    });
    return result.toUIMessageStreamResponse();
  });
  return router;
};

// Back-compat: previous registrar API mounts absolute path
export const createChatEndpoint: EndpointRegistrar = (app, state) => {
  return app.route("/v0", chatRouter(state));
};
