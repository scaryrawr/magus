import { Hono } from "hono";
import { serve } from "@hono/node-server";
import { type EndpointRegistrar, type ServerState } from "./types.js";
import { createChatEndpoint } from "./chat.js";
import { createModelsEndpoint } from "./models.js";

export interface ServerConfig extends ServerState {
  endpoints?: readonly EndpointRegistrar[];
}

export const createServer = (config: ServerConfig) => {
  const app = new Hono();
  const state: ServerState = {
    providers: config.providers,
    model: config.model,
  };

  const defaultEndpoints = [createChatEndpoint, createModelsEndpoint];

  // Register endpoints
  const endpoints = config.endpoints ? [...defaultEndpoints, ...config.endpoints] : defaultEndpoints;
  for (const registerEndpoint of endpoints) {
    registerEndpoint(app, state);
  }

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
