import type { MagusProvider } from "@magus/providers";
import type { LanguageModel, ToolSet } from "ai";
import type { Hono } from "hono";

export interface ServerState {
  providers: readonly MagusProvider[];
  model?: LanguageModel | undefined;
  tools?: ToolSet | undefined;
  systemPrompt?: string | undefined;
}

export type RouterFactory<THono extends Hono = Hono> = (state: ServerState) => THono;
