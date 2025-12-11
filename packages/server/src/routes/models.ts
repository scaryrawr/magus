import type { LanguageModel } from "ai";
import { Elysia, t } from "elysia";
import type { ObservableServerState } from "../ObservableServerState";
import type { ModelSelect } from "../types";
import { langueModelToModelSelect } from "../utils";

export const modelsRouter = (state: ObservableServerState) => {
  return new Elysia()
    .get("/models", async () => {
      const models = (
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

      return models;
    })
    .get("/model", ({ set }) => {
      if (!state.model) {
        set.status = 404;
        return "No model selected";
      }

      const model = state.model;
      if (typeof model === "string") {
        set.status = 500;
        return "Invalid model selected";
      }

      return {
        id: model.modelId,
        provider: model.provider,
      } satisfies ModelSelect;
    })
    .get("/model/:provider/:id", async ({ params, set }) => {
      const provider = state.providers[params.provider];
      if (!provider) {
        set.status = 404;
        return `Provider: ${params.provider} not found`;
      }
      try {
        const models = await provider.models();
        const model = models.find((m) => m.id === params.id);
        if (!model) {
          set.status = 404;
          return `Model: ${params.id} not found`;
        }
        return model;
      } catch {
        set.status = 404;
        return `Provider: ${params.provider} not found`;
      }
    })
    .put(
      "/model",
      ({ body, set }) => {
        const provider = state.providers[body.provider];
        if (!provider) {
          set.status = 404;
          return `Provider: ${body.provider} not found`;
        }
        try {
          state.model = provider.model(body.id);
        } catch {
          set.status = 404;
          return `Provider: ${body.provider} not found`;
        }
        return "";
      },
      {
        body: t.Object({
          provider: t.String(),
          id: t.String(),
        }),
      },
    )
    .get("/model/sse", () => {
      // Cleanup must be defined at outer scope before stream starts
      let modelChangeCallback: ((value: LanguageModel | undefined) => void) | undefined;
      let keepAlive: ReturnType<typeof setInterval> | undefined;

      const cleanup = () => {
        if (modelChangeCallback) {
          state.off("change:model", modelChangeCallback);
        }
        if (keepAlive) {
          clearInterval(keepAlive);
        }
      };

      return new Response(
        new ReadableStream({
          start(controller) {
            const encoder = new TextEncoder();

            modelChangeCallback = (value: LanguageModel | undefined) => {
              const data = langueModelToModelSelect(value);
              if (!data) return;
              const provider = state.providers[data?.provider];
              provider
                .models()
                .then((models) => {
                  const model = models.find((m) => m.id === data.id);
                  if (!model) return;

                  controller.enqueue(encoder.encode(`event: model-change\ndata: ${JSON.stringify(model)}\n\n`));
                })
                .catch(() => {
                  console.error(`Failed to fetch models for provider ${data?.provider}`);
                });
            };

            state.on("change:model", modelChangeCallback);

            // Keep-alive interval
            keepAlive = setInterval(() => {
              controller.enqueue(encoder.encode(": keepalive\n\n"));
            }, 1000);
          },
          cancel() {
            cleanup();
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          },
        },
      );
    });
};
