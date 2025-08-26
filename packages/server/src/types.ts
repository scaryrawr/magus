import type { MagusProvider } from "@magus/providers";
import type { LanguageModel, ToolSet } from "ai";
import type { Hono } from "hono";

export interface ServerState {
  providers: readonly MagusProvider[];
  model: LanguageModel;
  tools: ToolSet | undefined;
}

export type RouterFactory = (state: ServerState) => Hono;
