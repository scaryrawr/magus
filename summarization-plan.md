# Summarization Plan (Revised)

## Overview

Implement resilient, low-friction conversation compression that preserves critical context while preventing context window overflows for heterogeneous models. Summarization activates proactively based on token usage ratios (not just message counts), produces structured JSON, and maintains a chain of summaries with guardrails against drift and runaway recursion.

## Goals

1. Avoid hard stops when approaching model context limits.
2. Preserve key technical + decision context with minimal semantic loss.
3. Keep latency + token overhead low (ideally 1 auxiliary model call per trigger).
4. Provide auditability (summary history chain) and safe fallback when summarization fails.

## Non-Goals (v1)

- UI expansion of archived segments (can be future enhancement).
- Semantic diff of evolving summary content.
- Multi-layer semantic retrieval / vector memory.

## Core Concepts

- Token-Ratio Trigger with Hysteresis: Trigger at `triggerTokenRatio` (e.g. 0.80), then suppress retriggers until usage drops below `resetTokenRatio` (e.g. 0.70) or enough new messages accumulate.
- Depth Guard: Maximum `maxSummaryChainDepth` (default 3) prevents infinite recursive compression.
- Tail Preservation: Keep the most recent `preserveRecent` messages verbatim after summarization.
- Summary Chain: Each summary references parent summary (if any) enabling traceability.

## Configuration

```ts
interface SummarizationConfig {
  enabled: boolean; // Master switch
  triggerTokenRatio: number; // 0–1; ratio of estimated tokens to model context length
  resetTokenRatio: number; // Hysteresis lower bound (< triggerTokenRatio)
  minMessages: number; // Do not summarize below this message count
  preserveRecent: number; // Tail messages to keep verbatim
  maxSummaryChainDepth: number; // Hard cap to avoid runaway summarization
  forceRefreshAfterMessages?: number; // Optional periodic re-summarization cadence
  summarizerModelPreference?: string[]; // Ordered list of model IDs to attempt
  cooldownMessages: number; // Minimum new messages after a summarization before re-check
  abortOnFailure: boolean; // If false, silent fail + continue
}
```

Provide defaults in server layer (e.g. `enabled:true, triggerTokenRatio:0.8, resetTokenRatio:0.7, minMessages:12, preserveRecent:6, maxSummaryChainDepth:3, cooldownMessages:4, abortOnFailure:false`).

## Data Structures

```ts
interface SummaryContext {
  participants?: string[];
  decisions?: string[];
  actionItems?: { owner?: string; task: string; due?: string }[];
  unresolved?: string[];
  domainEntities?: string[]; // filenames, classes, APIs, etc.
  raw?: unknown; // optional escape hatch
}

interface SummaryRecord {
  id: string; // uuid
  timestamp: number; // ms
  depth: number; // 0 = first summarization
  parentId?: string; // previous summary id
  summary: string; // narrative paragraph(s)
  keyPoints: string[]; // bullet highlights
  context: SummaryContext; // structured facets
  originalMessageIds: string[]; // IDs of messages compressed
  tokenEstimate?: number; // optional snapshot
}

interface Chat {
  id: string;
  title: string;
  messages: UIMessage[]; // Active context (summary system message + recent tail)
  summaryHistory?: SummaryRecord[]; // Chain in chronological order
  // Optionally: lastSummarizationMeta for quick checks
  lastSummarization?: { depth: number; messageCount: number; tokenRatio: number };
}
```

## Summarizer Service API

File: `packages/server/src/services/summarizer.ts`

```ts
export interface SummarizationInput {
  messages: UIMessage[]; // candidate slice to compress
  modelInfo: { id: string; contextLength?: number };
  config: SummarizationConfig;
  depth: number;
}

export type SummarizeResult = { ok: true; record: SummaryRecord } | { ok: false; error: Error; retryable: boolean };

export async function summarizeConversation(input: SummarizationInput): Promise<SummarizeResult>;
```

### Internal Steps

1. Filter out purely mechanical/tool/system noise unless essential.
2. Estimate tokens (reuse AI-SDK token counting; fallback heuristic if unavailable).
3. Build prompt (see Prompt Engineering) + JSON schema instructions (Zod mirror).
4. Call `generateObject` with schema.
5. Validate + return `SummaryRecord`.
6. On failure: classify retryable vs terminal (network vs validation).

## Trigger Algorithm (Pseudo-code)

```ts
if (!config.enabled) return;
if (chat.summaryHistory?.length >= config.maxSummaryChainDepth) return;
if (messages.length < config.minMessages) return;
if (messagesSinceLast < config.cooldownMessages) return;

const { tokenEstimate, contextLength } = estimateTokens(messages, model);
const ratio = tokenEstimate / contextLength;
if (ratio < config.triggerTokenRatio) return;

const slice = selectCompressiblePortion(messages); // usually all except maybe newest tail
const result = await summarizeConversation({ messages: slice, modelInfo, config, depth });
if (!result.ok) {
  logFailure(result);
  if (config.abortOnFailure) throw result.error;
  else return;
}

// Replace history
const tail = tailMessages(messages, config.preserveRecent);
chat.summaryHistory.push(result.record);
chat.messages = [systemSummaryMessage(result.record), ...tail];
chat.lastSummarization = { depth: result.record.depth, messageCount: messages.length, tokenRatio: ratio };
```

### Hysteresis & Cooldown

- Store last summarization token ratio; only allow new summarization if either:
  - `ratio >= triggerTokenRatio` AND `messagesSinceLast >= cooldownMessages`, OR
  - `ratio >= 1.0` (emergency) ignoring cooldown.
- Prevents multiple triggers from a single long burst.

### Depth Strategy

- Each summarization compresses everything except the preserved tail.
- If after replacement the active context STILL exceeds threshold (rare unless enormous tail):
  - Attempt second pass (depth+1) if depth < maxSummaryChainDepth.
  - Else: Reduce `preserveRecent` adaptively (never below 2) and retry once.

## Prompt Engineering

Baseline system prompt (injected before user content):

```text
You are an expert conversation summarizer. Produce a STRICT JSON object ONLY matching the provided schema. No markdown, no commentary.
Preserve:
- Technical identifiers (filenames, class names, function signatures) verbatim.
- Concrete numbers, dates, versions.
If an element is absent, use an empty array instead of fabricating.
Do NOT add information not present in the source.
```

User content (fed to model) includes:

1. Optional meta header: `<meta total_messages=### total_tokens=### depth=# />`
2. Canonicalized message transcript (role labels + content), truncated if necessary from oldest side.

### JSON Schema Mirror (Zod)

Will enforce: `summary: non-empty string`, `keyPoints: <= 30 items`, each context array length-capped to prevent explosion.

## Failure Handling

- Categorize errors: validation vs transport.
- Retry once on transport (network/timeout) with exponential backoff (e.g. 250ms \* 2^attempt).
- On validation failure: log sanitized first 200 chars of raw output; do NOT retry automatically (avoid loops).
- If final failure and `abortOnFailure=false`: proceed with original messages (no mutation) and mark a diagnostic event.

## Security & Privacy Considerations

- Avoid duplicating raw message text inside `SummaryRecord` beyond IDs; only narrative + extracted structured data.
- Optional hash list: store `sha256` for each original message content to allow integrity checks (future enhancement).

## Integration Points

1. Token estimation occurs immediately before assembling model input for the next user message.
2. Summarization (if triggered) completes before constructing the final prompt for the assistant response.
3. Emission of an internal event: `state.emit("summarization", { reason, depth, tokensBefore, ratio })` for observability.

## Replacement Logic

- Insert a synthetic system message: `role: "system"`, tag: `summary-depth:<n>`.
- Tail messages remain unchanged to preserve recent conversational flow.
- Future summarizations compress prior summary system message + earlier tail (excluding current preserved tail if depth > 0).

## Testing Strategy (Expanded)

Unit (service):

1. Produces valid schema for mixed technical + decision content.
2. Handles empty arrays gracefully when no decisions.
3. Transport failure → retry once then fail safe.
4. Validation failure (malformed JSON) → returns ok:false.
5. Depth increment logic increments parentId & depth.

Integration (route):

1. Single long thread triggers summarization exactly once at ~0.8 ratio.
2. Hysteresis prevents immediate second summarization after a small burst.
3. Depth guard halts after configured max.
4. Emergency summarization at ratio >=1.0 ignores cooldown.
5. Summarization failure falls back without losing messages.

Drift Test:

1. Summarize → add new messages referencing early technical term → ensure term still present after second summarization.

Edge Cases:

1. Extremely long single user message.
2. Rapid 5-message burst crossing threshold (only one summarization).
3. Model with small context (2K) triggers multiple compressions up to depth cap.
4. Tool output messages (optionally filtered) not bloating summary.

## Performance Considerations

- Only 1 summarization model call per trigger.
- Prefer lighter summarizer model when available (`summarizerModelPreference`).
- Limit transcript tokens passed to summarizer (e.g. cap at 8K) trimming oldest.
- Optional cache key: hash of concatenated message IDs + last token count (low priority v1).

## Observability

- Event emission for each summarization.
- Debug log with: `depth`, `compressedMessages`, `ratioBefore`, `estimateAfter`.
- (Future) Telemetry summarization success rate and avg latency.

## Rollout Plan

1. Guarded by `enabled` config (default true but can disable quickly).
2. Initial depth cap 1 (single layer) to reduce risk; bump later to 3.
3. Monitor logs for validation failures / unexpected ratios.

## Implementation Steps (Revised)

1. Add config + defaults + validation schema.
2. Extend chat data model (add `SummaryRecord`, metadata fields).
3. Implement token estimation utility wrapper.
4. Build summarizer service + unit tests.
5. Integrate trigger algorithm + hysteresis + depth guard in chat route.
6. Add integration + drift tests.
7. Emit observability events + minimal logging.
8. Documentation & README update.
9. (Optional) periodic refresh & integrity hashing (defer).

## Open Questions (Updated)

1. Should we filter / compress tool output differently (e.g. cap lines)?
2. Do we need per-provider overrides for trigger ratios (some models are cheaper / more robust)?
3. Should we store a reversible compressed archive somewhere (for UI expand)?
4. How to surface summarization events in CLI UX (badge, subtle note, command)?
5. Accept user command to force refresh (`/resummarize`)? (future)

## Summary

This revised plan adds guardrails (hysteresis, depth, cooldown), stronger data contracts, clearer failure handling, expanded tests, and a more explicit integration algorithm. It is implementation-ready while leaving advanced retrieval / UI expansion for subsequent iterations.
