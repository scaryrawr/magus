import { type UIMessage, convertToModelMessages, streamText } from "ai";
import type { EndpointRegistrar } from "./types.js";

export const createChatEndpoint: EndpointRegistrar = (app, state) => {
  app.post("/v0/chat", async (c) => {
    const { messages }: { messages: UIMessage[] } = await c.req.json();
    const result = streamText({
      messages: convertToModelMessages(messages),
      model: state.model,
    });
    return result.toUIMessageStreamResponse();
  });

  return app;
};
