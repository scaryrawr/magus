import { generateObject, type LanguageModel, type UIMessage } from "ai";
import { z } from "zod";
import { type SummarizationConfig, type SummaryContext, type SummaryRecord } from "../types";

// ---------------- Zod Schemas for model output ----------------
const SummaryContextSchema = z.object({
  participants: z.array(z.string()).max(30).optional(),
  decisions: z.array(z.string()).max(50).optional(),
  actionItems: z
    .array(
      z.object({
        owner: z.string().max(60).optional(),
        task: z.string().max(400),
        due: z.string().max(60).optional(),
      }),
    )
    .max(50)
    .optional(),
  unresolved: z.array(z.string()).max(50).optional(),
  domainEntities: z.array(z.string()).max(80).optional(),
  raw: z.any().optional(),
});

const ModelSummarySchema = z.object({
  summary: z.string().min(1).max(5000),
  keyPoints: z.array(z.string().min(1).max(500)).max(30),
  context: SummaryContextSchema,
});

export interface SummarizationInput {
  messages: UIMessage[]; // candidate slice to compress
  model: LanguageModel | string; // allow string model id fallback
  modelInfo: { id: string; contextLength?: number };
  config?: Partial<SummarizationConfig>;
  depth: number;
  parentId?: string;
  tokenEstimate?: number;
  // DI for tests; intentionally lax typing to avoid coupling to ai SDK internals
  generate?: (options: unknown) => Promise<{ object: any }>; // eslint-disable-line @typescript-eslint/no-explicit-any
}

export type SummarizeResult = { ok: true; record: SummaryRecord } | { ok: false; error: Error; retryable: boolean };

// Lightweight heuristic token estimator used if caller does not provide a count.
const estimateTokens = (messages: UIMessage[]): number => {
  let chars = 0;
  for (const m of messages) {
    if (!Array.isArray(m.parts)) continue;
    for (const p of m.parts) {
      if (typeof p === "object" && p && (p as { type?: string }).type === "text") {
        const text = (p as { text?: string }).text || "";
        chars += text.length;
      }
    }
  }
  return Math.ceil(chars / 4); // heuristic
};

const SYSTEM_PROMPT = `You are an expert conversation summarizer. Produce a STRICT JSON object ONLY matching the provided schema. No markdown, no commentary.
Preserve:
- Technical identifiers (filenames, class names, function signatures) verbatim.
- The tasks, decisions, and action items discussed.
If an element is absent, use an empty array instead of fabricating.
Do NOT add information not present in the source.`;

function buildTranscript(messages: UIMessage[]): string {
  return messages
    .map((m) => {
      let text = "";
      if (Array.isArray(m.parts)) {
        text = m.parts
          .map((p) =>
            typeof p === "object" && p && (p as { type?: string }).type === "text"
              ? (p as { text?: string }).text || ""
              : "",
          )
          .filter(Boolean)
          .join("\n");
      }
      return `[${m.role}]\n${text}`;
    })
    .join("\n\n");
}

export async function summarizeConversation(input: SummarizationInput): Promise<SummarizeResult> {
  // (Config currently unused inside summarization beyond future hook)
  const gen = input.generate ?? generateObject;
  const tokenEstimate = input.tokenEstimate ?? estimateTokens(input.messages);

  const transcript = buildTranscript(input.messages);
  const meta = `<meta total_messages=${input.messages.length} total_tokens=${tokenEstimate} depth=${input.depth} />`;
  const userContent = `${meta}\n\n${transcript}`;

  const attempt = async (): Promise<SummarizeResult> => {
    try {
      const result = await gen({
        model: input.model,
        system: SYSTEM_PROMPT,
        schema: ModelSummarySchema,
        prompt: undefined,
        messages: [
          {
            role: "user",
            content: userContent,
          },
        ],
      });
      interface ModelOutput {
        summary: string;
        keyPoints: string[];
        context: SummaryContext;
      }
      const obj = result.object as unknown as ModelOutput;
      const record: SummaryRecord = {
        id: crypto.randomUUID(),
        timestamp: Date.now(),
        depth: input.depth,
        parentId: input.parentId,
        summary: obj.summary,
        keyPoints: obj.keyPoints,
        context: obj.context,
        originalMessageIds: input.messages.map((m) => m.id ?? crypto.randomUUID()),
        tokenEstimate,
      };
      return { ok: true, record };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      const retryable = /network|timeout|fetch|ECONNRESET/i.test(msg);
      return { ok: false, error: err instanceof Error ? err : new Error(msg), retryable };
    }
  };

  // Retry logic: one retry on retryable failures
  const first = await attempt();
  if (!first.ok && first.retryable) {
    await new Promise((r) => setTimeout(r, 250));
    return attempt();
  }
  return first;
}

// Helper to build a synthetic system message from a SummaryRecord
export function systemSummaryMessage(record: SummaryRecord): UIMessage {
  return {
    id: `summary-depth-${record.depth}-${record.id}`,
    role: "system",
    parts: [
      {
        type: "text",
        text: `Conversation summary (depth ${record.depth}).\n\n${record.summary}\n\nKey Points:\n- ${record.keyPoints.join("\n- ")}`,
      },
    ],
  } as UIMessage;
}

// Core trigger function (exported for tests) returning possibly mutated chat state pieces.
export interface TriggerResult {
  summarized: boolean;
  summaryRecord?: SummaryRecord;
  newMessages: UIMessage[]; // messages to persist if summarized or original if not
}

export interface TriggerParams {
  allMessages: UIMessage[];
  newUserMessage: UIMessage; // the message just appended (already present in allMessages)
  summarizationConfig: SummarizationConfig;
  modelContextLength: number; // fallback if unknown
  lastSummarization?: { depth: number; messageCount: number; tokenRatio: number };
  summaryHistory: SummaryRecord[];
  model: LanguageModel | string;
  generate?: SummarizationInput["generate"]; // test override
}

export async function maybeTriggerSummarization(p: TriggerParams): Promise<TriggerResult> {
  const cfg = p.summarizationConfig;
  if (!cfg.enabled) return { summarized: false, newMessages: p.allMessages };

  const depth = p.summaryHistory.length;
  if (depth >= cfg.maxSummaryChainDepth) return { summarized: false, newMessages: p.allMessages };

  const messageCount = p.allMessages.length;
  if (messageCount < cfg.minMessages) return { summarized: false, newMessages: p.allMessages };

  const tokenEstimate = estimateTokens(p.allMessages);
  const ratio = tokenEstimate / p.modelContextLength;

  const last = p.lastSummarization;
  const messagesSinceLast = last ? messageCount - last.messageCount : messageCount;

  const emergency = ratio >= 1.0;
  const canCooldown = !last || messagesSinceLast >= cfg.cooldownMessages;
  const ratioTrigger = ratio >= cfg.triggerTokenRatio && canCooldown;
  if (!ratioTrigger && !emergency) return { summarized: false, newMessages: p.allMessages };

  // Select portion to compress: everything except preserved tail
  const preserveCount = Math.max(2, cfg.preserveRecent);
  const tail = p.allMessages.slice(-preserveCount);
  const slice = p.allMessages.slice(0, -preserveCount);
  if (slice.length === 0) return { summarized: false, newMessages: p.allMessages };

  const result = await summarizeConversation({
    messages: slice,
    model: p.model,
    modelInfo: { id: "unknown" },
    depth,
    parentId: p.summaryHistory.at(-1)?.id,
    tokenEstimate,
    generate: p.generate,
  });

  if (!result.ok) {
    if (cfg.abortOnFailure) throw result.error;
    return { summarized: false, newMessages: p.allMessages };
  }

  const summaryMessage = systemSummaryMessage(result.record);
  const newMessages = [summaryMessage, ...tail];
  return { summarized: true, summaryRecord: result.record, newMessages };
}
