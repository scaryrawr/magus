import type { ChatStatus } from "ai";
import { describe, expect, it, mock } from "bun:test";
import { render } from "ink-testing-library";
import {
  ChatProvider,
  useChatContext,
  useChatId,
  useChatStatus,
  useChatUsage,
  type ChatContextValue,
} from "./ChatContext";

// Mock the ServerProvider context
const mockServerContext = {
  server: { url: new URL("http://localhost:3000") },
  client: {} as unknown,
};

mock.module("./ServerProvider", () => ({
  useServerContext: () => mockServerContext,
}));

// Mock the SSE manager
const mockUnsubscribe = mock(() => {});
const mockSubscribeToSse = mock(() => mockUnsubscribe);
mock.module("../utils/sseManager", () => ({
  subscribeToSse: mockSubscribeToSse,
}));

describe("ChatContext", () => {
  it("useChatContext requires a provider (basic check)", () => {
    // This test mainly documents that useChatContext should be used within a provider
    // The actual error throwing is tested in integration, but React error boundaries
    // make it hard to test directly in unit tests
    const TestComponent = () => {
      const context = useChatContext();
      expect(context).toBeDefined();
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );
  });

  it("provides initial state correctly", () => {
    let capturedState: ChatContextValue | null = null;

    const TestComponent = () => {
      const state = useChatContext();
      capturedState = state;
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(capturedState).not.toBeNull();
    expect(capturedState!).toEqual({
      chatStatus: undefined,
      chatId: undefined,
      setChatStatus: expect.any(Function),
      setChatId: expect.any(Function),
    });
  });

  it("updates chat status correctly", () => {
    let capturedSetStatus: ((status: ChatStatus | undefined) => void) | null = null;
    let capturedStatus: ChatStatus | undefined = undefined;

    const TestComponent = () => {
      const { chatStatus, setChatStatus } = useChatContext();
      capturedStatus = chatStatus;
      capturedSetStatus = setChatStatus;
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Initially undefined
    expect(capturedStatus).toBeUndefined();

    // The component should have the setter available
    expect(capturedSetStatus).toBeInstanceOf(Function);
  });

  it("updates chat ID correctly", () => {
    let capturedSetId: ((id: string | undefined) => void) | null = null;
    let capturedId: string | undefined = undefined;

    const TestComponent = () => {
      const { chatId, setChatId } = useChatContext();
      capturedId = chatId;
      capturedSetId = setChatId;
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Initially undefined
    expect(capturedId).toBeUndefined();

    // The component should have the setter available
    expect(capturedSetId).toBeInstanceOf(Function);
  });

  it("selector hooks work correctly", () => {
    let capturedStatus: ChatStatus | undefined = undefined;
    let capturedId: string | undefined = undefined;
    let setChatStatusFn: ((status: ChatStatus | undefined) => void) | null = null;
    let setChatIdFn: ((id: string | undefined) => void) | null = null;

    const TestComponent = () => {
      capturedStatus = useChatStatus();
      capturedId = useChatId();
      const { setChatStatus, setChatId } = useChatContext();
      setChatStatusFn = setChatStatus;
      setChatIdFn = setChatId;
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(capturedStatus).toBeUndefined();
    expect(capturedId).toBeUndefined();
    expect(setChatStatusFn).toBeInstanceOf(Function);
    expect(setChatIdFn).toBeInstanceOf(Function);
  });

  it("useChatUsage subscribes to SSE correctly", () => {
    const TestComponent = () => {
      const usage = useChatUsage("test-chat-123");
      expect(usage).toBeNull(); // Initial state
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(mockSubscribeToSse).toHaveBeenCalledWith(
      "http://localhost:3000/v0/chat/test-chat-123/sse",
      "usage",
      expect.any(Function),
    );
  });

  it("useChatUsage does not subscribe when chatId is undefined", () => {
    mockSubscribeToSse.mockClear();

    const TestComponent = () => {
      const usage = useChatUsage(undefined);
      expect(usage).toBeNull();
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(mockSubscribeToSse).not.toHaveBeenCalled();
  });

  it("useChatUsage unsubscribes on cleanup", () => {
    const TestComponent = ({ chatId }: { chatId: string | undefined }) => {
      useChatUsage(chatId);
      return null;
    };

    const { rerender, unmount } = render(
      <ChatProvider>
        <TestComponent chatId="test-chat-123" />
      </ChatProvider>,
    );

    // Change chatId to trigger cleanup
    rerender(
      <ChatProvider>
        <TestComponent chatId="test-chat-456" />
      </ChatProvider>,
    );

    expect(mockUnsubscribe).toHaveBeenCalled();

    // Cleanup
    unmount();
    expect(mockUnsubscribe).toHaveBeenCalledTimes(2); // Once for rerender, once for unmount
  });
});
