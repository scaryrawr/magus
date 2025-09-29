import { type MagusProvider } from "@magus/providers";
import { createServer, MagusChatStore, ModelsResultSchema, type MagusRoutes } from "@magus/server";
import type { EditorOutputPlugin } from "@magus/tools";
import type { ToolSet } from "ai";
import { hc } from "hono/client";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Tools are passed in so that main.ts stays focused on CLI concerns.
export interface CreateMagusServerOptions {
  tools: ToolSet;
  providers: MagusProvider;
  systemPrompt: string;
  plugins?: EditorOutputPlugin;
}

export const createMagusServer = ({ tools, systemPrompt, providers }: CreateMagusServerOptions) => {
  const { listen } = createServer({
    providers,
    chatStore: new MagusChatStore(join(process.cwd(), ".magus", "chats")),
    tools,
  });

  const server = listen();
  const client = hc<MagusRoutes>(server.url.href);
  void client.v0.models.$get().then(async (modelResponse) => {
    if (!modelResponse.ok) {
      throw new Error(`Failed to fetch models: ${modelResponse.status} ${modelResponse.statusText}`);
    }

    const models = ModelsResultSchema.parse(await modelResponse.json());

    // Just select the first model
    void client.v0.model.$put({
      json: models[0],
    });
  });

  void client.v0.systemPrompt.$put({ json: { systemPrompt } });
  readFile(join(process.cwd(), "AGENTS.md"), "utf8")
    .then((content) => {
      void client.v0.instructions.$patch({ json: { instruction: content } });
    })
    .catch(() =>
      readFile(join(process.cwd(), ".github", "copilot-instructions.md"), "utf8")
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
