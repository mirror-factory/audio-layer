/**
 * AI Telemetry — Full observability for every AI call.
 *
 * Three exports:
 * 1. `withTelemetry(ctx)` — returns telemetry config to spread into streamText/generateText
 * 2. `logAICall(params)` — logs structured AI call data (console + in-memory store)
 * 3. `logError(params)` — logs error events
 *
 * Storage: in-memory ring buffer (reference app). For production, see
 * templates/ai-telemetry-middleware.ts which supports file and Supabase backends.
 *
 * Minimum fields logged per AI request:
 *   - traceId (unique request id)
 *   - userId / sessionId / chatId
 *   - model / provider
 *   - inputTokens / outputTokens / totalCost
 *   - durationMs / ttftMs
 *   - toolCalls[]
 *   - finishReason
 *   - error state
 */

// ── Types ──────────────────────────────────────────────��──────────────

export interface TelemetryContext {
  userId?: string;
  sessionId?: string;
  chatId?: string;
  label?: string;
  metadata?: Record<string, string>;
}

export interface AILogRecord {
  traceId: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  chatId: string;
  label: string;
  provider: string;
  modelId: string;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  durationMs: number;
  ttftMs: number | null;
  steps: number;
  toolCalls: string[];
  finishReason: string | null;
  error: string | null;
  tokensPerSecond: number | null;
  aborted: boolean;
}

export interface ErrorRecord {
  id: string;
  timestamp: string;
  userId: string;
  chatId: string;
  label: string;
  source: string;
  message: string;
  stack: string | null;
  modelId: string | null;
  toolName: string | null;
}

// ── Cost Table (per 1M tokens: [input, output]) ─────────────────────

const MODEL_COSTS: Record<string, [number, number]> = {
  "gemini-3-flash": [0.5, 3.0],
  "gemini-3.1-flash-lite": [0.25, 1.5],
  "gemini-3-pro": [2.0, 12.0],
  "gemini-3.1-pro-preview": [2.0, 12.0],
  "gemini-2.5-flash": [0.15, 0.6],
  "claude-opus-4-6": [15.0, 75.0],
  "claude-sonnet-4-6": [3.0, 15.0],
  "claude-haiku-4-5": [0.8, 4.0],
  "gpt-4.1": [2.0, 8.0],
  "gpt-4.1-mini": [0.4, 1.6],
  "gpt-4.1-nano": [0.1, 0.4],
  "o4-mini": [1.1, 4.4],
};

function calculateCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number,
): number {
  const key = Object.keys(MODEL_COSTS).find((k) => modelId.includes(k));
  if (!key) return 0;
  const [inputCost, outputCost] = MODEL_COSTS[key];
  return (inputTokens * inputCost + outputTokens * outputCost) / 1_000_000;
}

// ── In-Memory Store ──────────────────────────────────────────────────

const MAX_LOGS = 500;
const aiLogs: AILogRecord[] = [];
const errorLogs: ErrorRecord[] = [];

/** Read recent AI logs (newest first) */
export function getLogs(limit = 100): AILogRecord[] {
  return aiLogs.slice(0, limit);
}

/** Read recent errors (newest first) */
export function getErrors(limit = 50): ErrorRecord[] {
  return errorLogs.slice(0, limit);
}

/** Aggregate stats from in-memory logs */
export function getStats() {
  const logs = aiLogs;
  const totalCost = logs.reduce((s, l) => s + l.cost, 0);
  const totalTokens = logs.reduce((s, l) => s + l.totalTokens, 0);
  const ttftValues = logs
    .filter((l) => l.ttftMs !== null)
    .map((l) => l.ttftMs!);
  const avgTTFT =
    ttftValues.length > 0
      ? ttftValues.reduce((a, b) => a + b, 0) / ttftValues.length
      : 0;

  const modelBreakdown: Record<
    string,
    { calls: number; cost: number; tokens: number }
  > = {};
  for (const l of logs) {
    if (!modelBreakdown[l.modelId])
      modelBreakdown[l.modelId] = { calls: 0, cost: 0, tokens: 0 };
    const m = modelBreakdown[l.modelId];
    m.calls++;
    m.cost += l.cost;
    m.tokens += l.totalTokens;
  }

  const toolFrequency: Record<string, number> = {};
  for (const l of logs) {
    for (const t of l.toolCalls) {
      toolFrequency[t] = (toolFrequency[t] ?? 0) + 1;
    }
  }

  return {
    totalCalls: logs.length,
    totalCost,
    totalTokens,
    avgTTFT,
    totalErrors: errorLogs.length,
    modelBreakdown,
    toolFrequency,
    models: Object.keys(modelBreakdown),
  };
}

// ── Telemetry Config ─────────────────────────────────────────────────

/** Spread this into every streamText / generateText call */
export const telemetryConfig = {
  experimental_telemetry: { isEnabled: true },
} as const;

// ── withTelemetry (spread pattern) ───────────────────────────────────

/**
 * Returns telemetry config to spread into streamText/generateText calls.
 * Usage: `streamText({ model, ...withTelemetry({ userId, chatId, label: 'chat' }), ... })`
 */
export function withTelemetry(context: TelemetryContext = {}) {
  return {
    experimental_telemetry: {
      isEnabled: true,
      functionId: context.label ?? 'unknown',
      metadata: {
        userId: context.userId ?? 'anonymous',
        sessionId: context.sessionId ?? 'default',
        chatId: context.chatId ?? 'default',
        ...(context.metadata ?? {}),
      },
    },
  };
}

// ── logAICall ────────────────────────────────────────────────────────

function generateTraceId(): string {
  return `tr-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Log a completed AI call with full structured data */
export function logAICall(params: {
  traceId?: string;
  context?: TelemetryContext;
  modelId: string;
  durationMs: number;
  inputTokens: number;
  outputTokens: number;
  ttftMs?: number | null;
  steps?: number;
  toolCalls?: string[];
  finishReason?: string | null;
  error?: string | null;
  tokensPerSecond?: number | null;
  aborted?: boolean;
}): AILogRecord {
  const inputTokens = params.inputTokens;
  const outputTokens = params.outputTokens;

  const record: AILogRecord = {
    traceId: params.traceId ?? generateTraceId(),
    timestamp: new Date().toISOString(),
    userId: params.context?.userId ?? "anonymous",
    sessionId: params.context?.sessionId ?? "default",
    chatId: params.context?.chatId ?? "default",
    label: params.context?.label ?? "chat",
    provider: params.modelId.split("/")[0] ?? "unknown",
    modelId: params.modelId,
    inputTokens,
    outputTokens,
    totalTokens: inputTokens + outputTokens,
    cost: calculateCost(params.modelId, inputTokens, outputTokens),
    durationMs: params.durationMs,
    ttftMs: params.ttftMs ?? null,
    steps: params.steps ?? 1,
    toolCalls: params.toolCalls ?? [],
    finishReason: params.finishReason ?? null,
    error: params.error ?? null,
    tokensPerSecond: params.tokensPerSecond ?? null,
    aborted: params.aborted ?? false,
  };

  // Persist to in-memory ring buffer
  aiLogs.unshift(record);
  if (aiLogs.length > MAX_LOGS) aiLogs.pop();

  // Console log for dev visibility
  const tools =
    record.toolCalls.length > 0
      ? ` | tools: [${record.toolCalls.join(", ")}]`
      : "";
  const err = record.error ? ` | ERROR: ${record.error}` : "";
  const costStr = record.cost > 0 ? ` | $${record.cost.toFixed(6)}` : "";
  const ttft =
    record.ttftMs !== null ? ` | TTFT: ${record.ttftMs}ms` : "";

  console.log( // keep: structured telemetry output
    `[AI:${record.label}] ${record.traceId} | ${record.modelId} | ${record.durationMs}ms${ttft} | ${inputTokens}in/${outputTokens}out${costStr}${tools} | ${record.finishReason ?? "unknown"}${err}`,
  );

  return record;
}

// ── logError ─────────────────────────────────────────────────────────

/** Log an AI-related error */
export function logError(params: {
  context?: TelemetryContext;
  error: unknown;
  source: string;
  modelId?: string;
  toolName?: string;
}): ErrorRecord {
  const err =
    params.error instanceof Error
      ? params.error
      : new Error(String(params.error));

  const record: ErrorRecord = {
    id: `err-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    userId: params.context?.userId ?? "anonymous",
    chatId: params.context?.chatId ?? "default",
    label: params.context?.label ?? "unknown",
    source: params.source,
    message: err.message,
    stack: err.stack ?? null,
    modelId: params.modelId ?? null,
    toolName: params.toolName ?? null,
  };

  errorLogs.unshift(record);
  if (errorLogs.length > MAX_LOGS) errorLogs.pop();

  console.error(
    `[AI:ERROR] ${record.id} | ${record.source} | ${record.message}`,
  );

  return record;
}
