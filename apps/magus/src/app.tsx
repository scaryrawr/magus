import {
  createLmStudioProvider,
  createOllamaProvider,
  createOpenRouterProvider,
  type MagusProvider,
} from "@magus/providers";
import { createServer, MagusChatStore, type MagusRoutes } from "@magus/server";
import { ModelsResultSchema } from "@magus/server/src/models";
import {
  createCreateFileTool,
  createEditorTool,
  createFindTool,
  createGrepTool,
  createInsertTool,
  createShellTool,
  createStringReplaceTool,
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

const providers: MagusProvider[] = [createOllamaProvider(), createLmStudioProvider()];
if (process.env.OPENROUTER_API_KEY) {
  providers.push(createOpenRouterProvider(process.env.OPENROUTER_API_KEY));
}

const createMagusServer = () => {
  const { listen, state } = createServer({
    providers,
    model: undefined,
    tools: undefined,
    systemPrompt: undefined,
    chatStore: new MagusChatStore(join(process.cwd(), ".magus", "chats")),
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
    // lmstudio has issues with the complex Editor Tool (so do most models... may need to fix it up)
    case "lmstudio":
      return {
        ...createShellTool(),
        ...createCreateFileTool(),
        ...createInsertTool(),
        ...createViewTool(),
        ...createStringReplaceTool(),
        ...createGrepTool(),
        ...createFindTool(),
        ...createWebFetchTool(),
      };
    default:
      return {
        ...createShellTool(),
        ...createEditorTool(),
        ...createGrepTool(),
        ...createFindTool(),
        ...createWebFetchTool(),
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

const getModelSpecificPrompt = (provider: string | undefined, modelName: string | undefined): string => {
  if (!provider || !modelName) {
    return "";
  }

  switch (provider) {
    case "lmstudio":
    case "ollama":
    default:
      return "";
  }
};

const getToolSpecificPrompt = (tools: ToolSet | undefined): string => {
  if (!tools) {
    return "";
  }

  const toolNames = Object.keys(tools);
  const hasEditor = toolNames.includes("editFile");
  const hasShell = toolNames.includes("shell");

  let prompt = `Available tools: ${toolNames.join(", ")}.`;

  if (hasEditor) {
    prompt += " You have access to the advanced editor tool for complex file modifications.";
  }

  if (hasShell) {
    prompt += " You can execute shell commands to interact with the system.";
  }

  return prompt;
};

// Let's use the .github/copilot-instructions.md if available
const loadInstructions = async (): Promise<string[]> => {
  const instructions: string[] = [];
  try {
    const instruction = await Bun.file(".github/copilot-instructions.md").text();
    instructions.push(instruction);
  } catch {
    // Ignore missing file
  }
  return instructions;
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
