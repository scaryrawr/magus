import { LmStudioModelInfoSchema } from "./lmstudio.js";

describe("parsing lmstudio models", () => {
  const apiResponse = {
    data: [
      {
        id: "qwen/qwen3-32b",
        object: "model",
        type: "llm",
        publisher: "qwen",
        arch: "qwen3",
        compatibility_type: "mlx",
        quantization: "4bit",
        state: "not-loaded",
        max_context_length: 40_960,
        capabilities: ["tool_use"],
      },
      {
        id: "openai/gpt-oss-20b",
        object: "model",
        type: "llm",
        publisher: "openai",
        arch: "gpt-oss",
        compatibility_type: "gguf",
        quantization: "MXFP4",
        state: "not-loaded",
        max_context_length: 131_072,
        capabilities: ["tool_use"],
      },
      {
        id: "qwen/qwen3-coder-30b",
        object: "model",
        type: "llm",
        publisher: "qwen",
        arch: "qwen3_moe",
        compatibility_type: "mlx",
        quantization: "4bit",
        state: "not-loaded",
        max_context_length: 262_144,
        capabilities: ["tool_use"],
      },
      {
        id: "qwen/qwen3-14b",
        object: "model",
        type: "llm",
        publisher: "qwen",
        arch: "qwen3",
        compatibility_type: "mlx",
        quantization: "4bit",
        state: "not-loaded",
        max_context_length: 40_960,
        capabilities: ["tool_use"],
      },
      {
        id: "text-embedding-nomic-embed-text-v1.5",
        object: "model",
        type: "embeddings",
        publisher: "nomic-ai",
        arch: "nomic-bert",
        compatibility_type: "gguf",
        quantization: "Q4_K_M",
        state: "not-loaded",
        max_context_length: 2048,
      },
    ],
    object: "list",
  };
  it("response parses successfully", () => {
    const result = LmStudioModelInfoSchema.parse(apiResponse);
    expect(result.data.length).toBeGreaterThan(0);
  });
});
