import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import z from "zod";
import type { RouterFactory, ServerState } from "./types";

export const ModelSelectSchema = z.object({
  provider: z.string(),
  id: z.string(),
});

export const ModelsResultSchema = z.array(ModelSelectSchema);

export type ModelSelect = z.infer<typeof ModelSelectSchema>;

export const modelsRouter = (state: ServerState) => {
  const router = new Hono();
  let modelsCache: ModelSelect[] | undefined = undefined;
  return router
    .get("/models", async (c) => {
      modelsCache ??= (
        await Promise.all(
          state.providers.map(async (provider) => {
            try {
              const models = await provider.models();
              return models.map((model) => ({
                provider: provider.name,
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
    .get("/model", async (c) => {
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
      const provider = state.providers.find((p) => p.name === providerId);
      if (!provider) {
        return c.text(`Provider: ${providerId} not found`, 404);
      }

      const models = await provider.models();
      const model = models.find((m) => m.id === modelId);
      if (!model) {
        return c.text(`Model: ${modelId} not found`, 404);
      }

      return c.json(model);
    })
    .post("/model", zValidator("json", ModelSelectSchema), async (c) => {
      const selection: ModelSelect = c.req.valid("json");
      const provider = state.providers.find((p) => p.name === selection.provider);
      if (!provider) {
        return c.text(`Provider: ${selection.provider} not found`, 404);
      }

      state.model = provider.model(selection.id);
      return c.text("", 200);
    });
};

modelsRouter satisfies RouterFactory<ReturnType<typeof modelsRouter>>;
