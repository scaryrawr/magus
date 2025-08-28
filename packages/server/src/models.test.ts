import { type LanguageModel } from "ai";
import { beforeEach, describe, expect, it } from "bun:test";
import { Hono } from "hono";
import { ModelInfoSchema, type MagusProvider, type ModelInfo } from "../../../packages/providers/src/types";
import { ModelSelectSchema, modelsRouter } from "./models";
import type { ServerState } from "./types";

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

// Mock Provider implementation
class MockProvider implements MagusProvider {
  constructor(
    public name: string,
    private mockModels: ModelInfo[],
  ) {}

  async models(): Promise<ModelInfo[]> {
    return this.mockModels;
  }

  model(id: string): LanguageModel {
    return createMockLanguageModel(id, this.name);
  }
}

// Test setup
let app: Hono;
let mockProvider1: MockProvider;
let mockProvider2: MockProvider;

beforeEach(() => {
  app = new Hono();

  mockProvider1 = new MockProvider("lmstudio", [
    {
      id: "gpt-4o-mini",
      reasoning: true,
      context_length: 128000,
      tool_use: true,
    },
  ]);

  mockProvider2 = new MockProvider("ollama", [
    {
      id: "mistral-7b",
      reasoning: false,
      context_length: 32000,
      tool_use: false,
    },
  ]);

  const state: ServerState = {
    providers: [mockProvider1, mockProvider2],
    model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
    tools: undefined,
  };

  app.route("/v0", modelsRouter(state));
});

describe("Models Endpoints", () => {
  describe("GET /v0/models", () => {
    it("should return all models from all providers", async () => {
      const res = await app.request("/v0/models");

      expect(res.status).toBe(200);
      const models = await res.json();

      expect(models).toEqual([
        { provider: "lmstudio", id: "gpt-4o-mini" },
        { provider: "ollama", id: "mistral-7b" },
      ]);
    });

    it("should return empty array when no providers have models", async () => {
      // Create app with providers that have no models
      const emptyApp = new Hono();
      const emptyProvider = new MockProvider("empty", []);

      const emptyState: ServerState = {
        providers: [emptyProvider],
        model: createMockLanguageModel("test", "empty"),
        tools: undefined,
      };

      emptyApp.route("/v0", modelsRouter(emptyState));

      const res = await emptyApp.request("/v0/models");

      expect(res.status).toBe(200);
      const models = await res.json();
      expect(models).toEqual([]);
    });
  });

  describe("GET /v0/model/:provider/:id", () => {
    it("should return specific model details", async () => {
      const res = await app.request("/v0/model/lmstudio/gpt-4o-mini");

      expect(res.status).toBe(200);
      const model = await res.json();

      expect(model).toEqual({
        id: "gpt-4o-mini",
        reasoning: true,
        context_length: 128000,
        tool_use: true,
      });
    });

    it("should return 404 for unknown provider", async () => {
      const res = await app.request("/v0/model/unknown/some-model");

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Provider: unknown not found");
    });

    it("should return 404 for unknown model", async () => {
      const res = await app.request("/v0/model/lmstudio/unknown-model");

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Model: unknown-model not found");
    });

    it("should handle models from different providers", async () => {
      const res1 = await app.request("/v0/model/lmstudio/gpt-4o-mini");
      const res2 = await app.request("/v0/model/ollama/mistral-7b");

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
      const res = await app.request("/v0/model");

      expect(res.status).toBe(200);
      const model = ModelSelectSchema.parse(await res.json());

      expect(model).toEqual({
        provider: "lmstudio",
        id: "gpt-4o-mini",
      });
    });

    it("should return 500 when model is a string", async () => {
      // Create app with string model
      const freshApp = new Hono();
      const freshState: ServerState = {
        providers: [mockProvider1],
        model: "string-model", // This will trigger the error case
        tools: undefined,
      };

      freshApp.route("/v0", modelsRouter(freshState));

      const res = await freshApp.request("/v0/model");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /v0/model", () => {
    it("should successfully change the current model", async () => {
      // Create a fresh app and state for this test to avoid interference
      const freshApp = new Hono();
      const freshState: ServerState = {
        providers: [mockProvider1, mockProvider2],
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
        tools: undefined,
      };

      freshApp.route("/v0", modelsRouter(freshState));

      const newSelection = {
        provider: "ollama",
        id: "mistral-7b",
      };

      const res = await freshApp.request("/v0/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSelection),
      });

      expect(res.status).toBe(200);

      // Verify the model was changed by checking the GET endpoint
      const getRes = await freshApp.request("/v0/model");
      expect(getRes.status).toBe(200);

      const currentModel = await getRes.json();
      expect(currentModel).toEqual({
        provider: "ollama",
        id: "mistral-7b",
      });
    });

    it("should return 404 for unknown provider", async () => {
      const res = await app.request("/v0/model", {
        method: "POST",
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
      const res = await app.request("/v0/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          provider: "lmstudio",
          // Missing 'id' field
        }),
      });

      // This should trigger a Zod validation error, which becomes a 500
      expect([400, 500]).toContain(res.status);
    });

    it("should handle model selection that doesn't exist in provider", async () => {
      // Create a fresh app and state for this test
      const freshApp = new Hono();
      const freshState: ServerState = {
        providers: [mockProvider1],
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
        tools: undefined,
      };
      freshApp.route("/v0", modelsRouter(freshState));

      const res = await freshApp.request("/v0/model", {
        method: "POST",
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
      const getRes = await freshApp.request("/v0/model");
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
