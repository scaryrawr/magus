import type { LanguageModel } from "ai";
import type { Hono } from "hono";
import type { MagusProvider } from "@magus/providers";

export interface ServerState {
  providers: readonly MagusProvider[];
  model: LanguageModel;
}

export type EndpointRegistrar = (app: Hono, state: ServerState) => Hono;
