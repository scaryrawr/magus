import type { MagusProvider } from "@magus/providers";
import type { LanguageModel } from "ai";
import type { Hono } from "hono";

export interface ServerState {
  providers: readonly MagusProvider[];
  model: LanguageModel;
}

export type RouterFactory = (state: ServerState) => Hono;
