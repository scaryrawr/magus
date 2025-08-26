import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";
import { createServer } from "@magus/server";
import {
  createCreateFileTool,
  createEditorTool,
  createInsertTool,
  createShellTool,
  createStringReplaceTool,
  createViewTool,
} from "@magus/tools";
import type { LanguageModel, ToolSet } from "ai";
import { render } from "ink";
import { App } from "./app";
import { ServerProvider } from "./contexts";
import { ToolSetProvider } from "./contexts/ToolSetProvider";

const createMagusServer = () => {
  const providers = [createLmStudioProvider(), createOllamaProvider()];
  const service = createServer({
    providers,
    model: providers[0].model("openai/gpt-oss-20b"),
    tools: undefined,
  });

  return {
    server: service.listen(),
    state: service.state,
  };
};

const getProviderToolSet = (provider: string): ToolSet => {
  switch (provider) {
    case "lmstudio":
      return {
        ...createShellTool(),
        ...createCreateFileTool(),
        ...createInsertTool(),
        ...createViewTool(),
        ...createStringReplaceTool(),
      };
    default:
      return {
        ...createShellTool(),
        ...createEditorTool(),
      };
  }
};

const getToolSet = (() => {
  const cache = new Map<string, ToolSet>();
  return (model: LanguageModel) => {
    let cacheKey = "default";
    if (typeof model !== "string") {
      cacheKey = model.provider.replace(".chat", "");
    }

    let value = cache.get(cacheKey);
    if (value) {
      return value;
    }

    value = getProviderToolSet(cacheKey);
    cache.set(cacheKey, value);
    return value;
  };
})();

try {
  await render(
    <ServerProvider createServer={createMagusServer}>
      <ToolSetProvider getToolSet={getToolSet}>
        <App />
      </ToolSetProvider>
    </ServerProvider>,
  ).waitUntilExit();
} catch (error) {
  console.error("Error:", error);
  process.exit(1);
}
