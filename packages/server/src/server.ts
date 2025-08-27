import type { LanguageModel } from "ai";
import { Hono } from "hono";
import { EventEmitter } from "node:events";
import { chatRouter } from "./chat.js";
import { modelsRouter } from "./models.js";
import type { RouterFactory, ServerState } from "./types.js";

export interface ServerConfig<TRouters extends readonly RouterFactory[] = readonly RouterFactory[]>
  extends ServerState {
  routers?: TRouters;
}

type ServerStateEvents = {
  "change:model": [newModel: LanguageModel];
};

export class ObservableServerState extends EventEmitter<ServerStateEvents> implements ServerState {
  constructor(private state: ServerState) {
    super();
  }

  get providers() {
    return this.state.providers;
  }

  get model(): LanguageModel | undefined {
    return this.state.model;
  }

  get tools() {
    return this.state.tools;
  }

  set tools(tools) {
    this.state.tools = tools;
  }

  set model(model: LanguageModel) {
    if (model !== this.state.model) {
      this.state.model = model;
      this.emit("change:model", model);
    }
  }
}

export const createServer = <TRouters extends readonly RouterFactory[]>(config: ServerConfig<TRouters>) => {
  const state = new ObservableServerState({
    ...config,
  });

  let app = new Hono();

  if (config.routers) {
    app = config.routers.reduce((app, makeRouter) => {
      return app.route("/v0", makeRouter(state));
    }, app);
  }

  const routes = app.route("/v0", chatRouter(state)).route("/v0", modelsRouter(state));
  return {
    app: routes,
    state,
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
