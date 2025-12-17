import { treaty } from "@elysiajs/eden";
import { type MagusProvider } from "@magus/providers";
import { createServer, MagusChatStore, ModelsResultSchema, type MagusRoutes } from "@magus/server";
import type { EditorOutputPlugin } from "@magus/tools";
import type { ToolSet } from "ai";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

// Tools are passed in so that main.ts stays focused on CLI concerns.
export interface CreateMagusServerOptions {
  tools: ToolSet;
  providers: MagusProvider;
  systemPrompt: string;
  plugins?: EditorOutputPlugin;
}

export type MagusClient = ReturnType<typeof treaty<MagusRoutes>>;

export const createMagusServer = ({ tools, systemPrompt, providers }: CreateMagusServerOptions) => {
  const { listen } = createServer({
    providers,
    chatStore: new MagusChatStore(join(process.cwd(), ".magus", "chats")),
    tools,
  });

  const server = listen();
  const client = treaty<MagusRoutes>(server.url.href);

  void client.v0.models.get().then((response) => {
    if (response.error) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const models = ModelsResultSchema.parse(response.data);

    // Just select the first model
    void client.v0.model.put(models[0]);
  });

  void client.v0.systemPrompt.put({ systemPrompt });
  readFile(join(process.cwd(), "AGENTS.md"), "utf8")
    .then((content) => {
      void client.v0.instructions.patch({ instruction: content });
    })
    .catch(() =>
      readFile(join(process.cwd(), ".github", "copilot-instructions.md"), "utf8")
        .then((content) => {
          void client.v0.instructions.patch({ instruction: content });
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
