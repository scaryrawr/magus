import type { UIMessage } from "ai";
import { describe, expect, it } from "bun:test";
import { maybeTriggerSummarization, summarizeConversation } from "./summarizer";

const makeMsg = (id: string, role: UIMessage["role"], text: string): UIMessage => ({
  id,
  role,
  parts: [{ type: "text", text }],
});

describe("summarizeConversation", () => {
  it("produces a SummaryRecord on success", async () => {
    const messages = [
      makeMsg("1", "user", "We decided to implement feature X"),
      makeMsg("2", "assistant", "Acknowledged."),
    ];
    let called = 0;
    const result = await summarizeConversation({
      messages,
      model: "test-model",
      modelInfo: { id: "test-model" },
      depth: 0,
      generate: async () => {
        called++;
        return {
          object: {
            summary: "Decision to implement feature X",
            keyPoints: ["Implement feature X"],
            context: { decisions: ["Implement feature X"], participants: ["user"] },
          },
        } as { object: { summary: string; keyPoints: string[]; context: Record<string, unknown> } };
      },
    });
    expect(called).toBe(1);
    expect(result.ok).toBeTrue();
    if (result.ok) {
      expect(result.record.summary.length).toBeGreaterThan(0);
      expect(result.record.depth).toBe(0);
      expect(result.record.keyPoints.length).toBe(1);
    }
  });

  it("retries once on retryable failure", async () => {
    const messages = [makeMsg("1", "user", "Test token counting")];
    let attempt = 0;
    const result = await summarizeConversation({
      messages,
      model: "test-model",
      modelInfo: { id: "test-model" },
      depth: 0,
      generate: async () => {
        attempt++;
        if (attempt === 1) throw new Error("Network timeout");
        return {
          object: { summary: "Ok", keyPoints: ["Ok"], context: {} },
        } as { object: { summary: string; keyPoints: string[]; context: Record<string, unknown> } };
      },
    });
    expect(attempt).toBe(2);
    expect(result.ok).toBeTrue();
  });
});

describe("maybeTriggerSummarization", () => {
  const baseMessages = Array.from({ length: 15 }, (_, i) =>
    makeMsg(String(i), i % 2 === 0 ? "user" : "assistant", "Message content number " + i + " with some repeated text."),
  );

  const config = {
    enabled: true,
    triggerTokenRatio: 0.8,
    resetTokenRatio: 0.7,
    minMessages: 12,
    preserveRecent: 4,
    maxSummaryChainDepth: 3,
    cooldownMessages: 4,
    abortOnFailure: false,
  } as const;

  it("summarizes when ratio threshold exceeded", async () => {
    const result = await maybeTriggerSummarization({
      allMessages: baseMessages,
      newUserMessage: baseMessages[baseMessages.length - 1],
      summarizationConfig: config,
      modelContextLength: 150, // small to force high ratio
      lastSummarization: undefined,
      summaryHistory: [],
      model: "test-model",
      generate: async () => ({
        object: { summary: "S", keyPoints: ["K"], context: {} },
      }),
    });
    expect(result.summarized).toBeTrue();
    expect(result.summaryRecord?.depth).toBe(0);
  });

  it("respects cooldown (no second summarization immediately)", async () => {
    const first = await maybeTriggerSummarization({
      allMessages: baseMessages,
      newUserMessage: baseMessages[baseMessages.length - 1],
      summarizationConfig: config,
      modelContextLength: 150,
      lastSummarization: undefined,
      summaryHistory: [],
      model: "test-model",
      generate: async () => ({ object: { summary: "S", keyPoints: ["K"], context: {} } }),
    });
    expect(first.summarized).toBeTrue();

    const extended = [...first.newMessages, ...baseMessages.slice(-2)];
    const second = await maybeTriggerSummarization({
      allMessages: extended,
      newUserMessage: extended[extended.length - 1],
      summarizationConfig: config,
      modelContextLength: 500,
      lastSummarization: { depth: 0, messageCount: baseMessages.length, tokenRatio: 0.9 },
      summaryHistory: first.summaryRecord ? [first.summaryRecord] : [],
      model: "test-model",
      generate: async () => ({ object: { summary: "S", keyPoints: ["K"], context: {} } }),
    });
    expect(second.summarized).toBeFalse();
  });

  it("emergency summarization at ratio >= 1.0 ignores cooldown", async () => {
    const last = { depth: 0, messageCount: baseMessages.length, tokenRatio: 0.9 };
    const result = await maybeTriggerSummarization({
      allMessages: baseMessages,
      newUserMessage: baseMessages[baseMessages.length - 1],
      summarizationConfig: config,
      modelContextLength: 120, // ensure ratio > 1
      lastSummarization: last,
      summaryHistory: [],
      model: "test-model",
      generate: async () => ({ object: { summary: "S", keyPoints: ["K"], context: {} } }),
    });
    expect(result.summarized).toBeTrue();
  });
});
