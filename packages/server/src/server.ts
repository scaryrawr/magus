import type { MagusProvider } from "@magus/providers";
import { Elysia } from "elysia";
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

  const app = new Elysia({ prefix: "/v0" })
    .use(chatRouter(state))
    .use(modelsRouter(state))
    .use(promptRouter(state))
    .use(toolsRouter(state));

  return {
    app,
    listen: (): BunCompatibleServer => {
      const server = app.listen(0);

      return {
        get url() {
          return server.server?.url ?? new URL("http://localhost:0");
        },
        get port() {
          return server.server?.port;
        },
        get hostname() {
          return server.server?.hostname;
        },
        async stop() {
          await server.stop();
        },
      };
    },
  };
};

export type MagusRoutes = ReturnType<typeof createServer>["app"];
