import { mkdirSync } from "node:fs";
import { readdir, readFile, stat, writeFile } from "node:fs/promises";
import { MagusChatSchema, type ChatEntry, type ChatStore, type MagusChat } from "./types";

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
    await writeFile(chatPath, JSON.stringify(initialChat), 'utf8');
    return chatId;
  }

  async getChats(): Promise<ChatEntry[]> {
    const files = await readdir(this.storagePath);
    const chats = await Promise.all(
      files
        .filter((file) => file.endsWith(".json"))
        .map(async (file) => {
          const id = file.replace(/\.json$/, "");
          const filePath = `${this.storagePath}/${file}`;
          const [modifiedAt, title] = await Promise.all([
            stat(filePath).then((s) => s.mtime),
            this.loadChat(id).then((chat) => chat.title),
          ]);
          return { id, title, modifiedAt };
        }),
    );

    // Sort by most recently modified first
    chats.sort((a, b) => b.modifiedAt.getTime() - a.modifiedAt.getTime());
    return chats;
  }

  async loadChat(chatId: string): Promise<MagusChat> {
    const chatPath = `${this.storagePath}/${chatId}.json`;
    const data = await readFile(chatPath, 'utf8');
    return MagusChatSchema.parse(JSON.parse(data));
  }

  async saveChat(chatId: string, chat: MagusChat): Promise<void> {
    const chatPath = `${this.storagePath}/${chatId}.json`;
    await writeFile(chatPath, JSON.stringify(chat), 'utf8');
  }
}
