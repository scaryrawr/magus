import { Hono } from "hono";
import { chatRouter } from "./chat.js";
import { modelsRouter } from "./models.js";
import { type EndpointRegistrar, type RouterFactory, type ServerState } from "./types.js";

export interface ServerConfig extends ServerState {
  // Back-compat: custom registrar functions; will be deprecated
  endpoints?: readonly EndpointRegistrar[];
  // Preferred: Hono routers to mount under /v0
  routers?: readonly RouterFactory[];
}

export const createServer = (config: ServerConfig) => {
  const app = new Hono();
  const state: ServerState = {
    providers: config.providers,
    model: config.model,
  };

  // Default routers mounted with best-practice `route()`
  const defaultRouters: RouterFactory[] = [chatRouter, modelsRouter];
  const routers: RouterFactory[] = config.routers ? [...defaultRouters, ...config.routers] : defaultRouters;
  for (const makeRouter of routers) {
    app.route("/v0", makeRouter(state));
  }

  // Back-compat: still allow endpoints registrars to mutate app directly
  if (config.endpoints && config.endpoints.length > 0) {
    for (const registerEndpoint of config.endpoints) {
      registerEndpoint(app, state);
    }
  }

  return {
    listen: () => {
      const server = Bun.serve({
        port: 0,
        idleTimeout: 0,
        fetch: app.fetch,
      });

      return server;
    },
  };
};
