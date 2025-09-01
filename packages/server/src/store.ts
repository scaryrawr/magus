import { mkdirSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { MagusChatSchema, type ChatStore, type MagusChat } from "./types";

export class MagusChatStore implements ChatStore {
  constructor(private storagePath: string) {
    // Ensure the storage path exists
    try {
      mkdirSync(this.storagePath, { recursive: true });
    } catch {
      // Ignore if it already exists
    }
  }

  async createChat(): Promise<string> {
    const chatId = crypto.randomUUID();
    const chatPath = `${this.storagePath}/${chatId}.json`;
    const initialChat: MagusChat = { messages: [] };
    await Bun.write(chatPath, JSON.stringify(initialChat));
    return chatId;
  }

  async getChats(): Promise<{ id: string; title?: string }[]> {
    const files = await readdir(this.storagePath);
    return Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const id = file.replace(/\.json$/, "");
          // Probably not ideal to load each chat to get the title...
          const title = (await this.loadChat(id)).title;
          return { id, title };
        }),
    );
  }

  async loadChat(chatId: string): Promise<MagusChat> {
    const chatPath = `${this.storagePath}/${chatId}.json`;
    const data = await readFile(chatPath, "utf-8");
    return MagusChatSchema.parse(JSON.parse(data));
  }

  async saveChat(chatId: string, chat: MagusChat): Promise<void> {
    const chatPath = `${this.storagePath}/${chatId}.json`;
    await Bun.write(chatPath, JSON.stringify(chat));
  }
}
