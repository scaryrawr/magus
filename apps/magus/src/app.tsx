import { createLmStudioProvider, createOllamaProvider, createOpenRouterProvider } from "@magus/providers";
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
import React from "react";
import { ChatContextProvider, RoutesProvider, ServerProvider } from "./contexts";
import { ToolSetProvider } from "./contexts/ToolSetProvider";
import { MagusRouterProvider } from "./routes";

const createMagusServer = () => {
  const providers = [createLmStudioProvider(), createOllamaProvider()];
  if (process.env.OPENROUTER_API_KEY) {
    providers.push(createOpenRouterProvider(process.env.OPENROUTER_API_KEY));
  }

  const { listen, state } = createServer({
    providers,
    model: undefined,
    tools: undefined,
    systemPrompt: undefined,
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

// Let's use the .github/copilot-instructions.md if available
const instructions: string[] = [];
try {
  const instruction = await Bun.file(".github/copilot-instructions.md").text();
  instructions.push(instruction);
} catch {
  // Ignore missing file
}

const systemPrompt =
  "You are Magus, an AI assistant that helps users with software engineering tasks. Provide clear and concise answers to their questions. When asked to perform tasks, create a checklist of steps to complete the task. Use the available tools when necessary, and always explain your reason for using the tool. Do not end your turn until your checklist is completely done. Only perform actions that are on your checklist.";

export const App: React.FC = () => {
  return (
    <ServerProvider createServer={createMagusServer}>
      <ChatContextProvider systemPrompt={systemPrompt} instructions={instructions}>
        <ToolSetProvider getToolSet={getToolSet}>
          <RoutesProvider>
            <MagusRouterProvider />
          </RoutesProvider>
        </ToolSetProvider>
      </ChatContextProvider>
    </ServerProvider>
  );
};
