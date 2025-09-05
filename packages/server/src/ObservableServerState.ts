import type { LanguageModel } from "ai";
import { EventEmitter } from "node:events";
import type { ServerState, ServerStateConfig } from "./types";
import { langueModelToModelSelect } from "./utils";

type ServerStateEvents = Required<{
  [TKey in keyof ServerState as `change:${TKey}`]: [newValue: ServerState[TKey]];
}>;

export class ObservableServerState extends EventEmitter<ServerStateEvents> implements ServerState {
  constructor(private state: ServerStateConfig) {
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
    if ("tools" in this.state) return this.state.tools;
    if (!("providerTools" in this.state)) return undefined;

    const modelInfo = langueModelToModelSelect(this.model);
    if (!modelInfo) return undefined;
    return this.state.providerTools?.[modelInfo.provider];
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
