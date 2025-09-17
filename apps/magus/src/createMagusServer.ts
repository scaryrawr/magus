import {
  createAzureProvider,
  createGitHubProvider,
  createLmStudioProvider,
  createOllamaProvider,
  createOpenRouterProvider,
} from "@magus/providers";
import { createServer, MagusChatStore, ModelsResultSchema, type MagusRoutes } from "@magus/server";
import type { EditorOutputPlugin } from "@magus/tools";
import type { ToolSet } from "ai";
import { hc } from "hono/client";
import { join } from "node:path";

// Tools are passed in so that main.ts stays focused on CLI concerns.
export interface CreateMagusServerOptions {
  tools: ToolSet; // shape defined by tools factory usage
  systemPrompt: string;
  plugins?: EditorOutputPlugin; // reserved for future use if needed externally
}

export const createMagusServer = ({ tools, systemPrompt }: CreateMagusServerOptions) => {
  const providers = {
    ...createLmStudioProvider(),
    ...createOllamaProvider(),
    ...(process.env.OPENROUTER_API_KEY ? createOpenRouterProvider(process.env.OPENROUTER_API_KEY) : undefined),
    ...(process.env.AZURE_RESOURCE_GROUP &&
    process.env.AZURE_RESOURCE_NAME &&
    process.env.AZURE_SUBSCRIPTION &&
    Bun.which("az")
      ? createAzureProvider({
          resourceGroup: process.env.AZURE_RESOURCE_GROUP,
          subscription: process.env.AZURE_SUBSCRIPTION,
          name: process.env.AZURE_RESOURCE_NAME,
        })
      : undefined),
    ...(process.env.GITHUB_TOKEN
      ? createGitHubProvider({
          oauthToken: process.env.GITHUB_TOKEN,
        })
      : undefined),
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

  void client.v0.systemPrompt.$put({ json: { systemPrompt } });
  Bun.file(join(process.cwd(), "AGENTS.md"))
    .text()
    .then((content) => {
      void client.v0.instructions.$patch({ json: { instruction: content } });
    })
    .catch(() =>
      Bun.file(join(process.cwd(), ".github", "copilot-instructions.md"))
        .text()
        .then((content) => {
          void client.v0.instructions.$patch({ json: { instruction: content } });
        })
        .catch(() => {
          // It's fine if there's no instructions file.
        }),
    );

  return {
    client,
    server,
  };
};
