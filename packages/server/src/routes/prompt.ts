import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import type { ServerState } from "../types";
import type { RouterFactory } from "./types";

export const promptRouter = (state: ServerState) => {
  const router = new Hono();
  return router
    .get("/prompt", (c) => {
      if (!state.prompt) {
        return c.text("No prompt set available", 404);
      }

      return c.text(state.prompt, 200);
    })
    .get("/systemPrompt", (c) => {
      if (!state.systemPrompt) {
        return c.text("No system prompt set", 404);
      }

      return c.text(state.systemPrompt, 200);
    })
    .put("/systemPrompt", zValidator("json", z.object({ systemPrompt: z.string() })), (c) => {
      const { systemPrompt } = c.req.valid("json");
      state.systemPrompt = systemPrompt;

      return c.text("System prompt updated", 200);
    })
    .get("/instructions", (c) => {
      if (!state.instructions) {
        return c.text("No instructions set", 404);
      }

      return c.json(state.instructions, 200);
    })
    .patch("/instructions", zValidator("json", z.object({ instruction: z.string() })), (c) => {
      const { instruction } = c.req.valid("json");
      const instructions = state.instructions ?? [];
      if (instructions.includes(instruction)) {
        return c.text("Instruction already exists", 400);
      }

      state.instructions = [...(state.instructions ?? []), instruction];
      return c.text("Instructions updated", 200);
    })
    .delete("/instructions", zValidator("json", z.object({ instruction: z.string() })), (c) => {
      const { instruction } = c.req.valid("json");
      const instructions = state.instructions ?? [];
      state.instructions = instructions.filter((i) => i !== instruction);
      return c.text("Instruction deleted", 200);
    });
};

promptRouter satisfies RouterFactory<ReturnType<typeof promptRouter>>;
