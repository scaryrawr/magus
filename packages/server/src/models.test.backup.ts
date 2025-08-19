import { describe, it, expect, beforeEach, vi } from "vitest";
import { Hono } from "hono";
import type { LanguageModel } from "ai";
import type { MagusProvider, ModelInfo } from "@magus/providers";
import type { ServerState } from "./types.js";
import { createModelsEndpoint, ModelSelectSchema, type ModelSelect } from "./models.js";

// Create a mock LanguageModel for testing
const createMockLanguageModel = (modelId: string, provider: string): LanguageModel => {
  const mockModel = {
    specificationVersion: "v2" as const,
    provider,
    modelId,
    defaultObjectGenerationMode: "json" as const,
    doGenerate: vi.fn(),
    doStream: vi.fn(),
    supportedUrls: {},
  };
  
  // Ensure these properties are accessible for our test
  Object.defineProperty(mockModel, "modelId", {
    value: modelId,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  
  Object.defineProperty(mockModel, "provider", {
    value: provider,
    writable: true,
    enumerable: true,
    configurable: true,
  });
  
  return mockModel as unknown as LanguageModel;
};

// Mock provider for testing
class MockProvider implements MagusProvider {
  constructor(
    public name: string,
    private mockModels: ModelInfo[] = [],
  ) {}

  async models(): Promise<ModelInfo[]> {
    return this.mockModels;
  }

  model(id: string): LanguageModel {
    return createMockLanguageModel(id, this.name);
  }
}

describe("Models Endpoints", () => {
  let app: Hono;
  let state: ServerState;
  let mockProvider1: MockProvider;
  let mockProvider2: MockProvider;

  beforeEach(() => {
    app = new Hono();
    
    // Create mock providers with different models
    mockProvider1 = new MockProvider("lmstudio", [
      {
        id: "gpt-4o-mini",
        reasoning: true,
        context_length: 128000,
        tool_use: true,
      },
      {
        id: "llama-3.1-8b",
        reasoning: false,
        context_length: 32768,
        tool_use: false,
      },
    ]);

    mockProvider2 = new MockProvider("ollama", [
      {
        id: "mistral-7b",
        reasoning: true,
        context_length: 8192,
        tool_use: true,
      },
    ]);

    state = {
      providers: [mockProvider1, mockProvider2],
      model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
    };

    createModelsEndpoint(app, state);
  });

  describe("Basic Route Registration", () => {

  describe("Manual Route Registration Test", () => {
    it("should manually register the same routes as createModelsEndpoint", async () => {
      const manualApp = new Hono();
      const manualState = {
        providers: [mockProvider1],
        model: createMockLanguageModel("test-model", "test-provider"),
      };
      
      // Manually add the exact routes from createModelsEndpoint
      manualApp.get("/v0/models", async (c) => {
        const models: ModelSelect[] = (
          await Promise.all(
            manualState.providers.map(async (provider) =>
              (await provider.models()).map((model) => ({
                provider: provider.name,
                id: model.id,
              })),
            ),
          )
        ).flat();
        return c.json(models);
      });

      manualApp.get("/v0/model", async (c) => {
        const model = manualState.model;
        if (typeof model === "string") {
          return c.status(500);
        }
        return c.json({
          id: (model as { modelId: string }).modelId,
          provider: (model as { provider: string }).provider,
        });
      });

      manualApp.get("/v0/model/:provider/:id", async (c) => {
        const providerId = c.req.param("provider");
        const modelId = c.req.param("id");
        const provider = manualState.providers.find((p) => p.name === providerId);
        if (!provider) {
          return c.text(`Provider: ${providerId} not found`, 404);
        }
        const models = await provider.models();
        const model = models.find((m) => m.id === modelId);
        if (!model) {
          return c.text(`Model: ${modelId} not found`, 404);
        }
        return c.json(model);
      });

      manualApp.post("/v0/model", async (c) => {
        try {
          console.log("Manual POST route hit");
          const json = await c.req.json();
          console.log("JSON received:", json);
          
          const selection = ModelSelectSchema.parse(json);
          console.log("Schema parsed:", selection);
          
          const provider = manualState.providers.find((p) => p.name === selection.provider);
          console.log("Provider found:", provider?.name);
          
          if (!provider) {
            console.log("Provider not found:", selection.provider);
            return c.text(`Provider: ${selection.provider} not found`, 404);
          }
          
          manualState.model = provider.model(selection.id);
          console.log("Model set successfully");
          return c.text("", 200); // Return a response instead of just setting status
        } catch (error) {
          console.log("Error in manual POST:", error);
          return c.text("Error: " + String(error), 500);
        }
      });

      // Test all routes
      console.log("Testing manually registered routes...");
      
      const getModelsRes = await manualApp.request("/v0/models");
      console.log("Manual GET /v0/models:", getModelsRes.status);
      
      const getModelRes = await manualApp.request("/v0/model");
      console.log("Manual GET /v0/model:", getModelRes.status);
      
      const getSpecificModelRes = await manualApp.request("/v0/model/lmstudio/gpt-4o-mini");
      console.log("Manual GET /v0/model/:provider/:id:", getSpecificModelRes.status);
      
      const postModelRes = await manualApp.request("/v0/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "lmstudio", id: "gpt-4o-mini" }),
      });
      console.log("Manual POST /v0/model:", postModelRes.status);
      
      // All should work
      expect(getModelsRes.status).toBe(200);
      expect(getModelRes.status).toBe(200);
      expect(getSpecificModelRes.status).toBe(200);
      expect(postModelRes.status).toBe(200);
    });
  });

  describe("Hono Debugging", () => {
    it("should handle basic POST requests in Hono", async () => {
      const debugApp = new Hono();
      
      // Manually add a simple POST route
      debugApp.post("/test", async (c) => {
        return c.text("POST works");
      });
      
      const res = await debugApp.request("/test", { method: "POST" });
      console.log("Basic POST test:", res.status);
      expect(res.status).toBe(200);
      
      const text = await res.text();
      expect(text).toBe("POST works");
    });

    it("should handle parameterized routes in Hono", async () => {
      const debugApp = new Hono();
      
      // Manually add a parameterized route
      debugApp.get("/test/:param", async (c) => {
        const param = c.req.param("param");
        return c.text(`Param: ${param}`);
      });
      
      const res = await debugApp.request("/test/hello");
      console.log("Parameterized route test:", res.status);
      expect(res.status).toBe(200);
      
      const text = await res.text();
      expect(text).toBe("Param: hello");
    });
  });

  describe("Basic Route Registration", () => {
    it("should register all routes correctly", async () => {
      const testApp = new Hono();
      const testState = {
        providers: [mockProvider1],
        model: createMockLanguageModel("test-model", "test-provider"),
      };
      
      createModelsEndpoint(testApp, testState);
      
      // Test that all routes respond (not necessarily with success)
      console.log("Testing route registration...");
      
      const getModelsRes = await testApp.request("/v0/models");
      console.log("GET /v0/models:", getModelsRes.status);
      
      const getModelRes = await testApp.request("/v0/model");
      console.log("GET /v0/model:", getModelRes.status);
      
      const getSpecificModelRes = await testApp.request("/v0/model/lmstudio/gpt-4o-mini");
      console.log("GET /v0/model/:provider/:id:", getSpecificModelRes.status);
      
      // Now test POST - this should NOT return 404 (route not found)
      const postModelRes = await testApp.request("/v0/model", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider: "lmstudio", id: "gpt-4o-mini" }),
      });
      console.log("POST /v0/model:", postModelRes.status);
      
      // If we get 404, the route isn't registered. Any other status means it is.
      expect(postModelRes.status).not.toBe(404);
    });
  });

  describe("GET /v0/models", () => {
    it("should return all models from all providers", async () => {
      const res = await app.request("/v0/models");
      
      expect(res.status).toBe(200);
      const models = await res.json();
      
      expect(models).toEqual([
        { provider: "lmstudio", id: "gpt-4o-mini" },
        { provider: "lmstudio", id: "llama-3.1-8b" },
        { provider: "ollama", id: "mistral-7b" },
      ]);
    });

    it("should return empty array when no providers have models", async () => {
      const emptyProvider = new MockProvider("empty", []);
      state.providers = [emptyProvider];
      
      const newApp = new Hono();
      createModelsEndpoint(newApp, state);
      
      const res = await newApp.request("/v0/models");
      
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
      const res = await app.request("/v0/model/ollama/mistral-7b");
      
      expect(res.status).toBe(200);
      const model = await res.json();
      
      expect(model).toEqual({
        id: "mistral-7b",
        reasoning: true,
        context_length: 8192,
        tool_use: true,
      });
    });
  });

  describe("GET /v0/model", () => {
    it("should return current selected model", async () => {
      const res = await app.request("/v0/model");
      
      expect(res.status).toBe(200);
      const model = await res.json();
      
      expect(model).toEqual({
        id: "gpt-4o-mini",
        provider: "lmstudio",
      });
    });

    it("should return 500 when model is a string", async () => {
      // Test the edge case where model is incorrectly set to a string
      const freshState = {
        providers: [mockProvider1, mockProvider2],
        model: "invalid-model" as unknown as LanguageModel,
      };
      
      const freshApp = new Hono();
      createModelsEndpoint(freshApp, freshState);
      
      const res = await freshApp.request("/v0/model");
      expect(res.status).toBe(500);
    });
  });

  describe("POST /v0/model", () => {
    it("should successfully change the current model", async () => {
      // Create a fresh app and state for this test to avoid interference
      const freshApp = new Hono();
      const freshState = {
        providers: [mockProvider1, mockProvider2],
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
      };
      createModelsEndpoint(freshApp, freshState);

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

      // Debug: log the response if it's not 200
      if (res.status !== 200) {
        console.log("Response status:", res.status);
        console.log("Response text:", await res.text());
      }

      expect(res.status).toBe(200);
      
      // Verify the model was changed by checking the GET endpoint
      const getCurrentModelRes = await freshApp.request("/v0/model");
      expect(getCurrentModelRes.status).toBe(200);
      const currentModel = await getCurrentModelRes.json();
      expect(currentModel).toEqual({
        id: "mistral-7b",
        provider: "ollama",
      });
    });

    it("should return 404 for unknown provider", async () => {
      // Create a fresh app and state for this test
      const freshApp = new Hono();
      const freshState = {
        providers: [mockProvider1, mockProvider2],
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
      };
      createModelsEndpoint(freshApp, freshState);

      const newSelection = {
        provider: "unknown",
        id: "some-model",
      };

      const res = await freshApp.request("/v0/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(newSelection),
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Provider: unknown not found");
      
      // Verify the original model wasn't changed
      const getCurrentModelRes = await freshApp.request("/v0/model");
      expect(getCurrentModelRes.status).toBe(200);
      const currentModel = await getCurrentModelRes.json();
      expect(currentModel).toEqual({
        id: "gpt-4o-mini",
        provider: "lmstudio",
      });
    });

    it("should validate request body against schema", async () => {
      const invalidData = {
        provider: "lmstudio",
        // missing id field
      };

      const res = await app.request("/v0/model", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(invalidData),
      });

      // This should throw a validation error and be handled by Hono
      expect(res.status).not.toBe(200);
    });

    it("should handle model selection that doesn't exist in provider", async () => {
      // Create a fresh app and state for this test
      const freshApp = new Hono();
      const freshState = {
        providers: [mockProvider1, mockProvider2],
        model: createMockLanguageModel("gpt-4o-mini", "lmstudio"),
      };
      createModelsEndpoint(freshApp, freshState);

      // Note: The current implementation doesn't validate if the model ID
      // actually exists in the provider's model list - it just creates
      // a LanguageModel with that ID. This test documents that behavior.
      const newSelection = {
        provider: "lmstudio",
        id: "non-existent-model",
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
      const getCurrentModelRes = await freshApp.request("/v0/model");
      expect(getCurrentModelRes.status).toBe(200);
      const currentModel = await getCurrentModelRes.json();
      expect(currentModel).toEqual({
        id: "non-existent-model",
        provider: "lmstudio",
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
        // missing id
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
