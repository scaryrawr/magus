import { createDefaultLspManager } from "@magus/lsp";
import { createLmStudioProvider, createOllamaProvider, createOpenRouterProvider } from "@magus/providers";
import { createServer, MagusChatStore, ModelsResultSchema, type MagusRoutes } from "@magus/server";
import {
  createFindTool,
  createSearchTool,
  createShellTool,
  createSplitTodoTool,
  createWebFetchTool,
  type EditorOutputPlugin,
} from "@magus/tools";
import { createSplitEditorTool } from "@magus/tools/src/tools/editor";
import { hc } from "hono/client";
import { join } from "node:path";
import React from "react";
import SYSTEM_PROMPT from "./codex.txt";
import { Banner } from "./components";
import { ChatContextProvider, RoutesProvider, ServerProvider } from "./contexts";
import { MagusRouterProvider } from "./routes";

const createMagusServer = () => {
  const providers = {
    ...createLmStudioProvider(),
    ...createOllamaProvider(),
    ...(process.env.OPENROUTER_API_KEY ? createOpenRouterProvider(process.env.OPENROUTER_API_KEY) : undefined),
  };

  const lsp = createDefaultLspManager();
  lsp.startWatcher();
  const plugins: EditorOutputPlugin = {
    diagnostics: (uri) => {
      const diagnostics = lsp.getDiagnostics(uri);
      if (!diagnostics) return "";
      const errors = diagnostics.all
        .map((d) => {
          const severityMap = {
            1: "ERROR",
            2: "WARN",
            3: "INFO",
            4: "HINT",
          };
          return `${severityMap[d.severity ?? 1]} [${uri}:${d.range.start.line + 1}:${d.range.start.character + 1}] ${d.message}`;
        })
        .join("\n")
        .trim();
      if (!errors) return "No issues found.";
      return `<diagnostic_errors>${errors}</diagnostic_errors>`;
    },
  };

  const tools = {
    ...createSplitEditorTool(plugins),
    ...createSplitTodoTool(),
    ...createSearchTool(),
    ...createFindTool(),
    ...createWebFetchTool(),
    ...createShellTool(),
  };

  const { listen } = createServer({
    providers,
    chatStore: new MagusChatStore(join(process.cwd(), ".magus", "chats")),
    tools,
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
