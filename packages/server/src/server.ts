import type { LanguageModel } from "ai";
import { Hono } from "hono";
import { EventEmitter } from "node:events";
import { chatRouter } from "./chat.js";
import { modelsRouter } from "./models.js";
import type { RouterFactory, ServerState } from "./types.js";

export interface ServerConfig extends ServerState {
  routers?: readonly RouterFactory[];
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

  get model() {
    return this.state.model;
  }

  set model(model: LanguageModel) {
    if (model !== this.state.model) {
      this.state.model = model;
      this.emit("change:model", model);
    }
  }
}

export const createServer = (config: ServerConfig) => {
  const app = new Hono();
  const state = new ObservableServerState({
    providers: config.providers,
    model: config.model,
  });

  // Default routers mounted with best-practice `route()`
  const defaultRouters: RouterFactory[] = [chatRouter, modelsRouter];
  const routers: RouterFactory[] = config.routers ? [...defaultRouters, ...config.routers] : defaultRouters;
  for (const makeRouter of routers) {
    app.route("/v0", makeRouter(state));
  }

  return {
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
