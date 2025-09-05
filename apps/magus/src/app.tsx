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
import type { LanguageModel, ToolSet } from "ai";
import { hc } from "hono/client";
import { join } from "node:path";
import React from "react";
import {
  ChatContextProvider,
  ModelProvider,
  RoutesProvider,
  ServerProvider,
  SystemPromptProvider,
  ToolSetProvider,
} from "./contexts";
import { MagusRouterProvider } from "./routes";

const providers = {
  ...createOllamaProvider(),
  ...createLmStudioProvider(),
  ...(process.env.OPENROUTER_API_KEY ? createOpenRouterProvider(process.env.OPENROUTER_API_KEY) : undefined),
};

const createMagusServer = () => {
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
  };
};

export const App: React.FC = () => {
  const [instructions, setInstructions] = React.useState<string[]>([]);

  React.useEffect(() => {
    loadInstructions().then(setInstructions);
  }, []);

  return (
    <ServerProvider createServer={createMagusServer}>
      <ModelProvider>
        <ToolSetProvider getToolSet={getToolSet}>
          <SystemPromptProvider
            config={{
              basePrompt:
                "You are Magus, an AI assistant that helps users with software engineering tasks. Provide clear and concise answers to their questions. When asked to perform tasks, create a todo list of steps to needed to complete the task. Use the available tools when necessary and always explain your reason for before using the tool. Do not end your turn until your todo list is completely done. Once the todo list is complete you may end your turn.",
              instructions,
              getModelSpecificPrompt,
              getToolSpecificPrompt,
            }}
          >
            <ChatContextProvider>
              <RoutesProvider>
                <MagusRouterProvider />
              </RoutesProvider>
            </ChatContextProvider>
          </SystemPromptProvider>
        </ToolSetProvider>
      </ModelProvider>
    </ServerProvider>
  );
};
