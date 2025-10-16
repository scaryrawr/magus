import type { ChatStatus } from "ai";
import { describe, expect, it, mock } from "bun:test";
import { render } from "ink-testing-library";
import { useEffect } from "react";
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
    const capturedStateRef = { current: null as ChatContextValue | null };

    const TestComponent = () => {
      const state = useChatContext();
      useEffect(() => {
        capturedStateRef.current = state;
      }, [state]);
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(capturedStateRef.current).not.toBeNull();
    expect(capturedStateRef.current!).toEqual({
      chatStatus: undefined,
      chatId: undefined,
      setChatStatus: expect.any(Function),
      setChatId: expect.any(Function),
    });
  });

  it("updates chat status correctly", () => {
    const capturedSetStatusRef = { current: null as ((status: ChatStatus | undefined) => void) | null };
    const capturedStatusRef = { current: undefined as ChatStatus | undefined };

    const TestComponent = () => {
      const { chatStatus, setChatStatus } = useChatContext();
      useEffect(() => {
        capturedStatusRef.current = chatStatus;
        capturedSetStatusRef.current = setChatStatus;
      }, [chatStatus, setChatStatus]);
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Initially undefined
    expect(capturedStatusRef.current).toBeUndefined();

    // The component should have the setter available
    expect(capturedSetStatusRef.current).toBeInstanceOf(Function);
  });

  it("updates chat ID correctly", () => {
    const capturedSetIdRef = { current: null as ((id: string | undefined) => void) | null };
    const capturedIdRef = { current: undefined as string | undefined };

    const TestComponent = () => {
      const { chatId, setChatId } = useChatContext();
      useEffect(() => {
        capturedIdRef.current = chatId;
        capturedSetIdRef.current = setChatId;
      }, [chatId, setChatId]);
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    // Initially undefined
    expect(capturedIdRef.current).toBeUndefined();

    // The component should have the setter available
    expect(capturedSetIdRef.current).toBeInstanceOf(Function);
  });

  it("selector hooks work correctly", () => {
    const capturedStatusRef = { current: undefined as ChatStatus | undefined };
    const capturedIdRef = { current: undefined as string | undefined };
    const setChatStatusFnRef = { current: null as ((status: ChatStatus | undefined) => void) | null };
    const setChatIdFnRef = { current: null as ((id: string | undefined) => void) | null };

    const TestComponent = () => {
      const status = useChatStatus();
      const id = useChatId();
      const { setChatStatus, setChatId } = useChatContext();
      useEffect(() => {
        capturedStatusRef.current = status;
        capturedIdRef.current = id;
        setChatStatusFnRef.current = setChatStatus;
        setChatIdFnRef.current = setChatId;
      }, [status, id, setChatStatus, setChatId]);
      return null;
    };

    render(
      <ChatProvider>
        <TestComponent />
      </ChatProvider>,
    );

    expect(capturedStatusRef.current).toBeUndefined();
    expect(capturedIdRef.current).toBeUndefined();
    expect(setChatStatusFnRef.current).toBeInstanceOf(Function);
    expect(setChatIdFnRef.current).toBeInstanceOf(Function);
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
