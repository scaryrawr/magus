import { serve } from "@hono/node-server";
import type { MagusProvider } from "@magus/providers";
import { Hono } from "hono";
import type { hc } from "hono/client";
import type { AddressInfo } from "node:net";
import { ObservableServerState } from "./ObservableServerState";
import { chatRouter, modelsRouter, promptRouter, toolsRouter } from "./routes";
import type { ServerStateConfig } from "./types";

// Type to maintain compatibility with Bun.serve interface
interface BunCompatibleServer {
  url: URL;
  stop(): Promise<void>;
  port?: number;
  hostname?: string;
}

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
    listen: (): BunCompatibleServer => {
      // Use the @hono/node-server serve function
      const nodeServer = serve({
        fetch: app.fetch,
        port: 0, // Use ephemeral port like Bun
      });

      // Get the address info immediately from the Node.js server
      const addressInfo = nodeServer.address() as AddressInfo;

      // Create a Bun-compatible interface
      const compatibleServer: BunCompatibleServer = {
        get url() {
          return new URL(`http://${addressInfo.address === "::" ? "[::1]" : addressInfo.address}:${addressInfo.port}`);
        },
        get port() {
          return addressInfo?.port;
        },
        get hostname() {
          return addressInfo?.address;
        },
        async stop() {
          return new Promise<void>((resolve, reject) => {
            nodeServer.close((err) => {
              if (err) {
                reject(err);
              } else {
                resolve();
              }
            });
          });
        },
      };

      return compatibleServer;
    },
  };
};

export type MagusRoutes = ReturnType<typeof createServer>["app"];
export type MagusClient = ReturnType<typeof hc<MagusRoutes>>;
