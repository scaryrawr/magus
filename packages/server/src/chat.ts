import { type UIMessage, convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import type { RouterFactory } from "./types.js";

// New: Router factory for mounting under a base path
export const chatRouter: RouterFactory = (state) => {
  const router = new Hono();
  router.post("/chat", async (c) => {
    const { messages }: { messages: UIMessage[] } = await c.req.json();
    const result = streamText({
      messages: convertToModelMessages(messages),
      model: state.model,
      tools: state.tools,
      stopWhen: async ({ steps }) => {
        // it's over 9000
        return steps.length > 9000;
      },
    });
    return result.toUIMessageStreamResponse();
  });
  return router;
};
