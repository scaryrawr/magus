import { ModelInfoSchema, type MagusProvider, type ModelInfo } from "@magus/providers";
import { type LanguageModel } from "ai";
import { beforeEach, describe, expect, it } from "bun:test";
import { Elysia, type AnyElysia } from "elysia";
import { ObservableServerState } from "../ObservableServerState";
import { ModelSelectSchema } from "../types";
import { modelsRouter } from "./models";

// Mock LanguageModel implementation
function createMockLanguageModel(modelId: string, provider: string): LanguageModel & { provider: string } {
  const model = Object.defineProperty({}, "modelId", {
    value: modelId,
    writable: false,
    enumerable: true,
    configurable: false,
  }) as LanguageModel;

  return Object.defineProperty(model, "provider", {
    value: provider,
    writable: false,
    enumerable: true,
    configurable: false,
  }) as LanguageModel & { provider: string };
}

// Since MagusProvider is now a record of provider objects keyed by name, we'll build simple provider objects
function createMockProvider(name: string, mockModels: ModelInfo[]) {
  return {
    model(id: string) {
      return createMockLanguageModel(id, name);
    },
    async models() {
      return mockModels;
    },
  };
}

// Test setup
let app: AnyElysia;
let mockProviders: MagusProvider;

beforeEach(() => {
  mockProviders = {
    lmstudio: createMockProvider("lmstudio", [
      {
        id: "gpt-4o-mini",
        reasoning: true,
        context_length: 128000,
        tool_use: true,
        provider: "lmstudio",
      },
    ]),
    ollama: createMockProvider("ollama", [
      {
        id: "mistral-7b",
        reasoning: false,
        context_length: 32000,
        tool_use: false,
        provider: "ollama",
      },
    ]),
  } satisfies MagusProvider;

  const state = new ObservableServerState({
    providers: mockProviders,
    model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
    tools: undefined,
    chatStore: undefined!,
    systemPrompt: undefined,
  });

  app = new Elysia({ prefix: "/v0" }).use(modelsRouter(state));
});

// Helper to make requests to Elysia app
async function request(app: AnyElysia, path: string, options?: RequestInit) {
  return app.handle(new Request(`http://localhost${path}`, options));
}

describe("Models Endpoints", () => {
  describe("GET /v0/models", () => {
    it("should return all models from all providers", async () => {
      const res = await request(app, "/v0/models");

      expect(res.status).toBe(200);
      const models = await res.json();

      expect(models).toEqual([
        { provider: "lmstudio", id: "gpt-4o-mini" },
        { provider: "ollama", id: "mistral-7b" },
      ]);
    });

    it("should return empty array when no providers have models", async () => {
      // Create app with providers that have no models
      const emptyProviders: MagusProvider = {
        empty: createMockProvider("empty", []),
      };

      const emptyState = new ObservableServerState({
        providers: emptyProviders,
        model: createMockLanguageModel("test", "empty"),
        tools: undefined,
        chatStore: undefined!,
        systemPrompt: undefined,
      });

      const emptyApp = new Elysia({ prefix: "/v0" }).use(modelsRouter(emptyState));

      const res = await request(emptyApp, "/v0/models");

      expect(res.status).toBe(200);
      const models = await res.json();
      expect(models).toEqual([]);
    });
  });

  describe("GET /v0/model/:provider/:id", () => {
    it("should return specific model details", async () => {
      const res = await request(app, "/v0/model/lmstudio/gpt-4o-mini");

      expect(res.status).toBe(200);
      const model = await res.json();

      expect(model).toEqual({
        id: "gpt-4o-mini",
        reasoning: true,
        context_length: 128000,
        provider: "lmstudio",
        tool_use: true,
      });
    });

    it("should return 404 for unknown provider", async () => {
      const res = await request(app, "/v0/model/unknown/some-model");

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Provider: unknown not found");
    });

    it("should return 404 for unknown model", async () => {
      const res = await request(app, "/v0/model/lmstudio/unknown-model");

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Model: unknown-model not found");
    });

    it("should handle models from different providers", async () => {
      const res1 = await request(app, "/v0/model/lmstudio/gpt-4o-mini");
      const res2 = await request(app, "/v0/model/ollama/mistral-7b");

      expect(res1.status).toBe(200);
      expect(res2.status).toBe(200);

      const result1 = await res1.json();
      const result2 = await res2.json();

      const model1 = ModelInfoSchema.parse(result1);
      const model2 = ModelInfoSchema.parse(result2);

      expect(model1.id).toBe("gpt-4o-mini");
      expect(model2.id).toBe("mistral-7b");
    });
  });

  describe("GET /v0/model", () => {
    it("should return current selected model", async () => {
      const res = await request(app, "/v0/model");

      expect(res.status).toBe(200);
      const model = ModelSelectSchema.parse(await res.json());

      expect(model).toEqual({
        provider: "lmstudio",
        id: "gpt-4o-mini",
      });
    });

    it("should return 500 when model is a string", async () => {
      // Create app with string model
      const freshState = new ObservableServerState({
        providers: { lmstudio: mockProviders.lmstudio },
        model: "string-model", // This will trigger the error case
        tools: undefined,
        chatStore: undefined!,
        systemPrompt: undefined,
      });

      const freshApp = new Elysia({ prefix: "/v0" }).use(modelsRouter(freshState));

      const res = await request(freshApp, "/v0/model");
      expect(res.status).toBe(500);
    });
  });

  describe("PUT /v0/model", () => {
    it("should successfully change the current model", async () => {
      // Create a fresh app and state for this test to avoid interference
      const freshState = new ObservableServerState({
        providers: mockProviders,
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
        tools: undefined,
        chatStore: undefined!,
        systemPrompt: undefined,
      });

      const freshApp = new Elysia({ prefix: "/v0" }).use(modelsRouter(freshState));

      const newSelection = {
        provider: "ollama",
        id: "mistral-7b",
      };

      const res = await request(freshApp, "/v0/model", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSelection),
      });

      expect(res.status).toBe(200);

      // Verify the model was changed by checking the GET endpoint
      const getRes = await request(freshApp, "/v0/model");
      expect(getRes.status).toBe(200);

      const currentModel = await getRes.json();
      expect(currentModel).toEqual({
        provider: "ollama",
        id: "mistral-7b",
      });
    });

    it("should return 404 for unknown provider", async () => {
      const res = await request(app, "/v0/model", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "unknown",
          id: "some-model",
        }),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Provider: unknown not found");
    });

    it("should validate request body against schema", async () => {
      const res = await request(app, "/v0/model", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "lmstudio",
          // Missing 'id' field
        }),
      });

      // This should trigger a validation error
      expect([400, 422, 500]).toContain(res.status);
    });

    it("should handle model selection that doesn't exist in provider", async () => {
      // Create a fresh app and state for this test
      const freshState = new ObservableServerState({
        providers: { lmstudio: mockProviders.lmstudio },
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
        tools: undefined,
        chatStore: undefined!,
        systemPrompt: undefined,
      });
      const freshApp = new Elysia({ prefix: "/v0" }).use(modelsRouter(freshState));

      const res = await request(freshApp, "/v0/model", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "lmstudio",
          id: "non-existent-model", // This model doesn't exist in mockProvider1
        }),
      });

      expect(res.status).toBe(200);

      // Verify the model was changed by checking the GET endpoint
      const getRes = await request(freshApp, "/v0/model");
      expect(getRes.status).toBe(200);

      const currentModel = await getRes.json();
      expect(currentModel).toEqual({
        provider: "lmstudio",
        id: "non-existent-model",
      });
    });
  });

  describe("ModelSelectSchema", () => {
    it("should validate valid model selection", () => {
      const validData = {
        provider: "lmstudio",
        id: "gpt-4o-mini",
      };

      const result = ModelSelectSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data).toEqual(validData);
      }
    });

    it("should reject invalid model selection", () => {
      const invalidData = {
        provider: "lmstudio",
        // Missing 'id' field
      };

      const result = ModelSelectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it("should reject model selection with wrong types", () => {
      const invalidData = {
        provider: 123,
        id: "gpt-4o-mini",
      };

      const result = ModelSelectSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });
});
