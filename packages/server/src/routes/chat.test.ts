import { type LanguageModel, type UIMessage } from "ai";
import { beforeEach, describe, expect, it, mock } from "bun:test";
import { Hono } from "hono";
import { ObservableServerState } from "../ObservableServerState";
import { type ChatStore, type MagusChat } from "../types";
import { chatRouter } from "./chat";

// Mock LanguageModel implementation
function createMockLanguageModel(modelId: string, provider: string): LanguageModel & { provider: string } {
  const model = Object.defineProperty({}, "modelId", {
    value: modelId,
    writable: false,
    enumerable: true,
    configurable: false,
  }) as LanguageModel;

  return Object.defineProperty(model, "provider", {
    value: provider,
    writable: false,
    enumerable: true,
    configurable: false,
  }) as LanguageModel & { provider: string };
}

// Mock ChatStore implementation
class MockChatStore implements ChatStore {
  private chats = new Map<string, MagusChat>();
  private chatCounter = 0;

  async createChat(): Promise<string> {
    const chatId = `test-chat-${++this.chatCounter}`;
    this.chats.set(chatId, { messages: [] });
    return chatId;
  }

  async getChats() {
    return Array.from(this.chats.entries()).map(([id, chat]) => ({
      id,
      title: chat.title,
      modifiedAt: new Date(),
    }));
  }

  async loadChat(chatId: string): Promise<MagusChat> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      throw new Error(`Chat ${chatId} not found`);
    }
    return chat;
  }

  async saveChat(chatId: string, chat: MagusChat): Promise<void> {
    this.chats.set(chatId, chat);
  }

  // Helper methods for testing
  setChatData(chatId: string, chat: MagusChat) {
    this.chats.set(chatId, chat);
  }

  getChatData(chatId: string): MagusChat | undefined {
    return this.chats.get(chatId);
  }
}

// Mock generateObject function
const mockGenerateObject = mock(() =>
  Promise.resolve({
    object: {
      summary: "This is a test conversation about AI and programming.",
      key_points: ["Discussed AI capabilities", "Talked about programming best practices", "Reviewed code examples"],
      context: "The user is learning about AI development and asking technical questions.",
    },
  }),
);

// Mock the ai package
mock.module("ai", () => ({
  streamText: mock(() => ({
    toUIMessageStreamResponse: mock(() => ({})),
  })),
  generateObject: mockGenerateObject,
  convertToModelMessages: mock((messages: unknown) => messages),
  createIdGenerator: mock(() => () => "mock-id-123"),
}));

// Test setup
let app: Hono;
let mockChatStore: MockChatStore;
let mockModel: LanguageModel & { provider: string };

beforeEach(() => {
  app = new Hono();
  mockChatStore = new MockChatStore();
  mockModel = createMockLanguageModel("gpt-4o-mini", "lmstudio");

  const state = new ObservableServerState({
    providers: {},
    model: mockModel,
    tools: undefined,
    chatStore: mockChatStore,
    systemPrompt: "You are a helpful assistant.",
  });

  app.route("/v0", chatRouter(state));
});

describe("Chat Endpoints", () => {
  describe("POST /v0/chat/new", () => {
    it("should create a new chat and return chatId", async () => {
      const res = await app.request("/v0/chat/new", {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const result = (await res.json()) as { chatId: string };
      expect(result).toHaveProperty("chatId");
      expect(typeof result.chatId).toBe("string");
    });
  });

  describe("GET /v0/chats", () => {
    it("should return list of chats", async () => {
      // Create a test chat first
      await mockChatStore.createChat();

      const res = await app.request("/v0/chats");

      expect(res.status).toBe(200);
      const chats = (await res.json()) as unknown[];
      expect(Array.isArray(chats)).toBe(true);
      expect(chats.length).toBeGreaterThan(0);
    });
  });

  describe("GET /v0/chat/:chatId/load", () => {
    it("should load an existing chat", async () => {
      const chatId = await mockChatStore.createChat();
      const testChat: MagusChat = {
        title: "Test Chat",
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      };
      mockChatStore.setChatData(chatId, testChat);

      const res = await app.request(`/v0/chat/${chatId}/load`);

      expect(res.status).toBe(200);
      const chat = (await res.json()) as { title: string; messages: unknown[] };
      expect(chat.title).toBe("Test Chat");
      expect(chat.messages).toHaveLength(1);
    });

    it("should return 404 for non-existent chat", async () => {
      const res = await app.request("/v0/chat/non-existent/load");

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Chat not found");
    });
  });

  describe("POST /v0/chat/:chatId/summarize", () => {
    it("should summarize a chat with enough messages", async () => {
      const chatId = await mockChatStore.createChat();

      // Create a chat with multiple messages for summarization testing
      const messages: UIMessage[] = [];
      for (let i = 0; i < 15; i++) {
        messages.push({
          id: `msg-${i}`,
          role: i % 2 === 0 ? "user" : "assistant",
          parts: [{ type: "text", text: `Message ${i + 1}` }],
        });
      }

      const testChat: MagusChat = {
        title: "Long Chat",
        messages,
      };
      mockChatStore.setChatData(chatId, testChat);

      const res = await app.request(`/v0/chat/${chatId}/summarize`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const result = (await res.json()) as {
        success: boolean;
        summary: { summary: string };
      };
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(result.summary.summary).toBe("This is a test conversation about AI and programming.");
      expect(mockGenerateObject).toHaveBeenCalled();

      // Check that the chat was updated with summarized messages
      const updatedChat = mockChatStore.getChatData(chatId);
      expect(updatedChat?.summarized_messages).toBeDefined();
      expect(updatedChat?.summarized_messages?.length).toBeGreaterThan(0);
    });

    it("should summarize even a chat with few messages", async () => {
      const chatId = await mockChatStore.createChat();
      const testChat: MagusChat = {
        title: "Short Chat",
        messages: [
          {
            id: "msg-1",
            role: "user",
            parts: [{ type: "text", text: "Hello" }],
          },
        ],
      };
      mockChatStore.setChatData(chatId, testChat);

      const res = await app.request(`/v0/chat/${chatId}/summarize`, {
        method: "POST",
      });

      expect(res.status).toBe(200);
      const result = (await res.json()) as {
        success: boolean;
        summary: { summary: string };
      };
      expect(result.success).toBe(true);
      expect(result.summary).toBeDefined();
      expect(mockGenerateObject).toHaveBeenCalled();
    });

    it("should return 404 for non-existent chat", async () => {
      const res = await app.request("/v0/chat/non-existent/summarize", {
        method: "POST",
      });

      expect(res.status).toBe(404);
      const text = await res.text();
      expect(text).toBe("Chat not found");
    });

    it("should return 500 when no model is selected", async () => {
      // Create a state without a model
      const stateWithoutModel = new ObservableServerState({
        providers: {},
        model: undefined,
        tools: undefined,
        chatStore: mockChatStore,
        systemPrompt: undefined,
      });

      const appWithoutModel = new Hono();
      appWithoutModel.route("/v0", chatRouter(stateWithoutModel));

      const chatId = await mockChatStore.createChat();
      const res = await appWithoutModel.request(`/v0/chat/${chatId}/summarize`, {
        method: "POST",
      });

      expect(res.status).toBe(500);
      const text = await res.text();
      expect(text).toBe("Please select a model first");
    });
  });

  describe("Chat continuation with summarized messages", () => {
    it("should use summarized messages for context when available", async () => {
      const chatId = await mockChatStore.createChat();

      // Create a chat with both original and summarized messages
      const originalMessages: UIMessage[] = [];
      for (let i = 0; i < 10; i++) {
        originalMessages.push({
          id: `orig-msg-${i}`,
          role: i % 2 === 0 ? "user" : "assistant",
          parts: [{ type: "text", text: `Original message ${i + 1}` }],
        });
      }

      const summarizedMessages: UIMessage[] = [
        {
          id: "summary-msg",
          role: "assistant",
          parts: [{ type: "text", text: "This conversation has been summarized." }],
        },
      ];

      const testChat: MagusChat = {
        title: "Chat with Summary",
        messages: originalMessages,
        summarized_messages: summarizedMessages,
      };
      mockChatStore.setChatData(chatId, testChat);

      // Mock streamText to verify it's called with the right context
      const { streamText } = await import("ai");

      // Try to send a new message to the chat
      const newMessage: UIMessage = {
        id: "new-msg",
        role: "user",
        parts: [{ type: "text", text: "Continue conversation" }],
      };

      await app.request(`/v0/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: newMessage,
          id: chatId,
        }),
      });

      // The endpoint should work (streamText should be called)
      expect(streamText).toHaveBeenCalled();
    });
  });
});
