import { Hono } from "hono";
import { type ServerState } from "../types";
import type { RouterFactory } from "./types";

export const toolsRouter = (state: ServerState) => {
  const router = new Hono();
  return router.get("/tools", (c) => {
    if (!state.tools) {
      return c.json([]);
    }

    return c.json(state.tools);
  });
};

toolsRouter satisfies RouterFactory<ReturnType<typeof toolsRouter>>;
