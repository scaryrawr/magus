import { Elysia } from "elysia";
import { type ServerState } from "../types";

export const toolsRouter = (state: ServerState) => {
  return new Elysia().get("/tools", () => {
    if (!state.tools) {
      return [];
    }
    return state.tools;
  });
};
