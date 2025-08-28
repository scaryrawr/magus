import { type UIMessage, convertToModelMessages, streamText } from "ai";
import { Hono } from "hono";
import type { RouterFactory, ServerState } from "./types";

export const chatRouter = (state: ServerState) => {
  const router = new Hono();
  return router.post("/chat", async (c) => {
    if (!state.model) {
      return c.text("Please select a model first", 500);
    }

    const { messages }: { messages: UIMessage[] } = await c.req.json();
    try {
      const result = streamText({
        messages: convertToModelMessages(messages),
        model: state.model,
        tools: state.tools,
        stopWhen: async ({ steps }) => {
          // it's over 9000
          return steps.length > 9000;
        },
        system: state.systemPrompt,
      });
      return result.toUIMessageStreamResponse();
    } catch (e) {
      const error = e as Error;
      return c.text(error.message, 500);
    }
  });
};

chatRouter satisfies RouterFactory<ReturnType<typeof chatRouter>>;
