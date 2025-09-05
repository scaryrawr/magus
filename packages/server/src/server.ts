import type { MagusProvider } from "@magus/providers";
import type { LanguageModel } from "ai";
import { Hono } from "hono";
import type { hc } from "hono/client";
import { streamSSE } from "hono/streaming";
import { ObservableServerState } from "./ObservableServerState";
import { chatRouter } from "./chat";
import { modelsRouter } from "./models";
import type { ServerStateConfig } from "./types";
import { langueModelToModelSelect } from "./utils";

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
    .get("/v0/sse", async (c) => {
      return streamSSE(c, async (stream) => {
        const modelChangeCallback = (value: LanguageModel | undefined) => {
          const data = langueModelToModelSelect(value);
          if (!data) return;

          stream.writeSSE({
            data: JSON.stringify(data),
            event: "model-change",
          });
        };

        state.on("change:model", modelChangeCallback);
        try {
          while (true) {
            await stream.sleep(1000);
          }
        } finally {
          state.off("change:model", modelChangeCallback);
        }
      });
    });
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

export type RouterFactory<THono extends Hono = Hono> = (state: ObservableServerState) => THono;
