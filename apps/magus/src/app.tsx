import { createLmStudioProvider, createOllamaProvider, createOpenRouterProvider } from "@magus/providers";
import { createServer, MagusChatStore, ModelsResultSchema, type MagusRoutes } from "@magus/server";
import {
  createCreateFileTool,
  createEditorTool,
  createFindTool,
  createGrepTool,
  createInsertTool,
  createShellTool,
  createStringReplaceTool,
  createTodoTool,
  createViewTool,
  createWebFetchTool,
} from "@magus/tools";
import { hc } from "hono/client";
import { join } from "node:path";
import React from "react";
import SYSTEM_PROMPT from "./codex.txt";
import { Banner } from "./components";
import { ChatContextProvider, RoutesProvider, ServerProvider } from "./contexts";
import { MagusRouterProvider } from "./routes";

const createMagusServer = () => {
  const providers = {
    ...createOllamaProvider(),
    ...createLmStudioProvider(),
    ...(process.env.OPENROUTER_API_KEY ? createOpenRouterProvider(process.env.OPENROUTER_API_KEY) : undefined),
  };

  const sharedToolset = {
    ...createGrepTool(),
    ...createFindTool(),
    ...createWebFetchTool(),
    ...createShellTool(),
  };

  const defaultToolset = {
    ...createEditorTool(),
    ...createTodoTool(),
    ...sharedToolset,
  };

  const individualToolset = {
    ...createCreateFileTool(),
    ...createInsertTool(),
    ...createStringReplaceTool(),
    ...createViewTool(),
    ...createInsertTool(),
    ...sharedToolset,
  };

  const { listen } = createServer({
    providers,
    chatStore: new MagusChatStore(join(process.cwd(), ".magus", "chats")),
    providerTools: {
      lmstudio: individualToolset,
      ollama: defaultToolset,
      openrouter: defaultToolset,
    },
  });

  const server = listen();
  const client = hc<MagusRoutes>(server.url.href);
  void client.v0.models.$get().then(async (modelResponse) => {
    const models = ModelsResultSchema.parse(await modelResponse.json());

    // Just select the first model
    void client.v0.model.$put({
      json: models[0],
    });
  });

  void client.v0.systemPrompt.$put({ json: { systemPrompt: SYSTEM_PROMPT } });
  Bun.file(join(process.cwd(), ".github", "copilot-instructions.md"))
    .text()
    .then((content) => {
      void client.v0.instructions.$patch({ json: { instruction: content } });
    })
    .catch(() => {
      // It's fine if there's no instructions file.
    });

  return {
    client,
    server,
  };
};

export const App: React.FC = () => {
  return (
    <ServerProvider createServer={createMagusServer}>
      <ChatContextProvider>
        <RoutesProvider>
          <Banner />
          <MagusRouterProvider />
        </RoutesProvider>
      </ChatContextProvider>
    </ServerProvider>
  );
};
