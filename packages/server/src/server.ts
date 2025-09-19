import type { MagusProvider } from "@magus/providers";
import { Hono } from "hono";
import type { hc } from "hono/client";
import { ObservableServerState } from "./ObservableServerState";
import { chatRouter, modelsRouter, promptRouter, toolsRouter } from "./routes";
import type { ServerStateConfig } from "./types";

export const createServer = <MProviders extends MagusProvider = MagusProvider>(
  config: ServerStateConfig<MProviders>,
) => {
  const state = new ObservableServerState({
    ...config,
  });

  const app = new Hono();
  const routes = app
    .route("/v0", chatRouter(state))
    .route("/v0", modelsRouter(state))
    .route("/v0", promptRouter(state))
    .route("/v0", toolsRouter(state));

  return {
    app: routes,
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

export type MagusRoutes = ReturnType<typeof createServer>["app"];
export type MagusClient = ReturnType<typeof hc<MagusRoutes>>;
