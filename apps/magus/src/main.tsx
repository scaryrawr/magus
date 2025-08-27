import { createLmStudioProvider, createOllamaProvider } from "@magus/providers";
import { createServer, type MagusRoutes } from "@magus/server";
import { ModelsResultSchema } from "@magus/server/src/models";
import {
  createCreateFileTool,
  createEditorTool,
  createInsertTool,
  createShellTool,
  createStringReplaceTool,
  createViewTool,
} from "@magus/tools";
import type { LanguageModel, ToolSet } from "ai";
import { hc } from "hono/client";
import { render } from "ink";
import { App } from "./app";
import { ServerProvider } from "./contexts";
import { ToolSetProvider } from "./contexts/ToolSetProvider";

const createMagusServer = () => {
  const providers = [createLmStudioProvider(), createOllamaProvider()];
  const { listen, state } = createServer({
    providers,
    model: providers[0].model("openai/gpt-oss-20b"),
    tools: undefined,
  });

  const server = listen();
  const client = hc<MagusRoutes>(server.url.href);
  client.v0.models.$get().then(async (modelResponse) => {
    const models = ModelsResultSchema.parse(await modelResponse.json());

    // Just select the first model
    client.v0.model.$post({
      json: models[0],
    });
  });

  return {
    client,
    server,
    state,
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
  return (model: LanguageModel | undefined) => {
    if (!model) {
      return undefined;
    }

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
