import { Elysia, t } from "elysia";
import type { ServerState } from "../types";

export const promptRouter = (state: ServerState) => {
  return new Elysia()
    .get("/prompt", ({ set }) => {
      if (!state.prompt) {
        set.status = 404;
        return "No prompt set available";
      }
      return state.prompt;
    })
    .get("/systemPrompt", ({ set }) => {
      if (!state.systemPrompt) {
        set.status = 404;
        return "No system prompt set";
      }
      return state.systemPrompt;
    })
    .put(
      "/systemPrompt",
      ({ body }) => {
        state.systemPrompt = body.systemPrompt;
        return "System prompt updated";
      },
      {
        body: t.Object({
          systemPrompt: t.String(),
        }),
      },
    )
    .get("/instructions", ({ set }) => {
      if (!state.instructions) {
        set.status = 404;
        return "No instructions set";
      }
      return state.instructions;
    })
    .patch(
      "/instructions",
      ({ body, set }) => {
        const instructions = state.instructions ?? [];
        if (instructions.includes(body.instruction)) {
          set.status = 400;
          return "Instruction already exists";
        }
        state.instructions = [...(state.instructions ?? []), body.instruction];
        return "Instructions updated";
      },
      {
        body: t.Object({
          instruction: t.String(),
        }),
      },
    )
    .delete(
      "/instructions",
      ({ body }) => {
        const instructions = state.instructions ?? [];
        state.instructions = instructions.filter((i) => i !== body.instruction);
        return "Instruction deleted";
      },
      {
        body: t.Object({
          instruction: t.String(),
        }),
      },
    );
};
