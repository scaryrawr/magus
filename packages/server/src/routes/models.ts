import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { ModelSelectSchema, type ModelSelect, type ServerState } from "../types";
import type { RouterFactory } from "./types";

export const modelsRouter = (state: ServerState) => {
  const router = new Hono();
  let modelsCache: ModelSelect[] | undefined = undefined;
  return router
    .get("/models", async (c) => {
      modelsCache ??= (
        await Promise.all(
          Object.entries(state.providers).map(async ([name, provider]) => {
            try {
              const models = await provider.models();
              return models.map((model) => ({
                provider: name,
                id: model.id,
              }));
            } catch {
              // Skip misbehaving providers
              return [];
            }
          }),
        )
      ).flat();

      return c.json(modelsCache);
    })
    .get("/model", (c) => {
      if (!state.model) {
        return c.text("No model selected", 404);
      }

      const model = state.model;
      if (typeof model === "string") {
        return c.text("Invalid model selected", 500);
      }

      return c.json<ModelSelect>({
        id: model.modelId,
        provider: model.provider,
      });
    })
    .get("/model/:provider/:id", async (c) => {
      const providerId = c.req.param("provider");
      const modelId = c.req.param("id");
      const provider = state.providers[providerId];
      if (!provider) {
        return c.text(`Provider: ${providerId} not found`, 404);
      }
      try {
        const models = await provider.models();
        const model = models.find((m) => m.id === modelId);
        if (!model) {
          return c.text(`Model: ${modelId} not found`, 404);
        }
        return c.json(model);
      } catch {
        return c.text(`Provider: ${providerId} not found`, 404);
      }
    })
    .put("/model", zValidator("json", ModelSelectSchema), (c) => {
      const selection: ModelSelect = c.req.valid("json");
      const provider = state.providers[selection.provider];
      if (!provider) {
        return c.text(`Provider: ${selection.provider} not found`, 404);
      }
      try {
        state.model = provider.model(selection.id);
      } catch {
        return c.text(`Provider: ${selection.provider} not found`, 404);
      }
      return c.text("", 200);
    });
};

modelsRouter satisfies RouterFactory<ReturnType<typeof modelsRouter>>;
