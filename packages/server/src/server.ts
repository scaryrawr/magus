import type { LanguageModel } from "ai";
import { Hono } from "hono";
import type { hc } from "hono/client";
import { EventEmitter } from "node:events";
import { chatRouter } from "./chat";
import { modelsRouter } from "./models";
import type { ServerState } from "./types";

type ServerStateEvents = Required<{
  [TKey in keyof ServerState as `change:${TKey}`]: [newValue: ServerState[TKey]];
}>;

export class ObservableServerState extends EventEmitter<ServerStateEvents> implements ServerState {
  constructor(private state: ServerState) {
    super();
  }

  get chatStore() {
    return this.state.chatStore;
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
    if (this.state.tools === tools) return;

    this.state.tools = tools;
    this.emit("change:tools", tools);
  }

  get systemPrompt() {
    return this.state.systemPrompt;
  }

  set systemPrompt(prompt) {
    if (this.state.systemPrompt === prompt) return;

    this.state.systemPrompt = prompt;
    this.emit("change:systemPrompt", prompt);
  }

  set model(model) {
    if (model === this.state.model) return;

    this.state.model = model;
    this.emit("change:model", model);
  }
}

export const createServer = (config: ServerState) => {
  const state = new ObservableServerState({
    ...config,
  });

  const app = new Hono();
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
export type MagusClient = ReturnType<typeof hc<MagusRoutes>>;
