/**
 * AI Request Logger — Full console visibility for every AI call
 *
 * Logs: provider, model, tokens (in/out/total), estimated cost,
 * tool calls, step count, duration, finish reason.
 *
 * Usage:
 *   import { aiLogger } from '@/lib/ai/logger';
 *
 *   const result = streamText({
 *     model: aiGateway('google/gemini-3-flash'),
 *     prompt: '...',
 *     ...aiLogger('chat'),  // Spreads onStart, onStepFinish, onFinish
 *     ...withTelemetry({ label: 'chat' }),  // required in production
 *   });
 *
 * Or for generateText:
 *   const result = await generateText({
 *     model,
 *     prompt,
 *     ...aiLogger('generate-frame'),
 *     ...withTelemetry({ label: 'generate-frame' }),
 *   });
 */

// ── Cost per million tokens (customize for your models) ──────────────
const COST_PER_M_TOKENS: Record<string, { input: number; output: number }> = {
  // Google Gemini
  'gemini-3-flash': { input: 0.50, output: 3.00 },
  'gemini-3-flash-preview': { input: 0.50, output: 3.00 },
  'gemini-3.1-pro-preview': { input: 2.00, output: 12.00 },
  'gemini-3.1-flash-lite-preview': { input: 0.25, output: 1.50 },
  'gemini-2.5-flash': { input: 0.15, output: 0.60 },
  'gemini-3.1-flash-image-preview': { input: 0.50, output: 3.00 },
  'gemini-3-pro-image-preview': { input: 2.00, output: 12.00 },
  // Anthropic
  'claude-sonnet-4-6': { input: 3.00, output: 15.00 },
  'claude-opus-4-6': { input: 15.00, output: 75.00 },
  'claude-haiku-4-5': { input: 0.80, output: 4.00 },
  // OpenAI
  'gpt-4.1': { input: 2.00, output: 8.00 },
  'gpt-4.1-mini': { input: 0.40, output: 1.60 },
  'gpt-4.1-nano': { input: 0.10, output: 0.40 },
  'o4-mini': { input: 1.10, output: 4.40 },
};

function estimateCost(modelId: string, inputTokens: number, outputTokens: number): number {
  // Strip provider prefix if present (e.g., "google/gemini-3-flash" → "gemini-3-flash")
  const bareId = modelId.includes('/') ? modelId.split('/').pop()! : modelId;

  // Find matching pricing (partial match for variants)
  const pricing = COST_PER_M_TOKENS[bareId]
    || Object.entries(COST_PER_M_TOKENS).find(([k]) => bareId.includes(k))?.[1]
    || { input: 1.00, output: 3.00 }; // Default fallback

  return (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
}

function formatCost(cost: number): string {
  if (cost < 0.001) return `$${(cost * 1000).toFixed(3)}m`; // sub-penny: show in milli-dollars
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(3)}`;
}

function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

// ── Logger Factory ────────────────────────────────────────────────────

interface LogEntry {
  label: string;
  provider?: string;
  modelId?: string;
  startTime: number;
  steps: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  toolCalls: string[];
}

/**
 * Creates streamText/generateText callbacks that log everything to console.
 * Pair with withTelemetry() from lib/ai/telemetry for full tracing.
 *
 * @param label — identifies this request in logs (e.g., "chat", "generate-frame")
 * @param options.silent — suppress console output (still tracks internally)
 * @param options.onComplete — callback with the full log entry
 */
export function aiLogger(
  label: string,
  options?: {
    silent?: boolean;
    onComplete?: (entry: LogEntry) => void;
  },
) {
  const entry: LogEntry = {
    label,
    startTime: Date.now(),
    steps: 0,
    totalInputTokens: 0,
    totalOutputTokens: 0,
    toolCalls: [],
  };

  const log = options?.silent ? () => {} : console.log;

  return {
    experimental_onStart: (event: { model: { modelId: string; provider: string } }) => {
      entry.provider = event.model.provider;
      entry.modelId = event.model.modelId;
      log(
        `\x1b[36m[AI:${label}]\x1b[0m ▶ ${event.model.provider}/${event.model.modelId}`
      );
    },

    onStepFinish: (event: {
      stepNumber: number;
      finishReason: string;
      usage: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      toolCalls?: Array<{ toolName: string }>;
    }) => {
      entry.steps = event.stepNumber + 1;
      const inputTokens = event.usage.inputTokens || 0;
      const outputTokens = event.usage.outputTokens || 0;
      entry.totalInputTokens += inputTokens;
      entry.totalOutputTokens += outputTokens;

      const tools = event.toolCalls?.map(t => t.toolName) || [];
      entry.toolCalls.push(...tools);

      const toolStr = tools.length > 0 ? ` → tools: [${tools.join(', ')}]` : '';
      log(
        `\x1b[36m[AI:${label}]\x1b[0m   step ${event.stepNumber}: ` +
        `${inputTokens}in/${outputTokens}out ` +
        `(${event.finishReason})${toolStr}`
      );
    },

    onFinish: (event: {
      finishReason: string;
      totalUsage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      usage?: { inputTokens?: number; outputTokens?: number; totalTokens?: number };
      steps?: Array<unknown>;
    }) => {
      const duration = Date.now() - entry.startTime;
      const totalUsage = event.totalUsage || event.usage || {};
      const totalIn = totalUsage.inputTokens || entry.totalInputTokens;
      const totalOut = totalUsage.outputTokens || entry.totalOutputTokens;
      const cost = estimateCost(entry.modelId || '', totalIn, totalOut);

      // Cache metrics (Anthropic prompt caching / Gemini context caching)
      const details = (totalUsage as Record<string, unknown>).inputTokenDetails as
        { cacheReadTokens?: number; cacheWriteTokens?: number } | undefined;
      const cacheRead = details?.cacheReadTokens || 0;
      const cacheWrite = details?.cacheWriteTokens || 0;
      const cacheStr = cacheRead > 0
        ? ` | cache: ${cacheRead} read / ${cacheWrite} write (${Math.round(cacheRead / totalIn * 100)}% cached)`
        : cacheWrite > 0
        ? ` | cache: ${cacheWrite} written (will hit on next call)`
        : '';

      log(
        `\x1b[36m[AI:${label}]\x1b[0m ✓ ${formatDuration(duration)} | ` +
        `${entry.steps} step${entry.steps !== 1 ? 's' : ''} | ` +
        `${totalIn}in/${totalOut}out (${totalIn + totalOut} total) | ` +
        `${formatCost(cost)} | ` +
        `${entry.provider}/${entry.modelId}` +
        (entry.toolCalls.length > 0 ? ` | tools: [${[...new Set(entry.toolCalls)].join(', ')}]` : '') +
        cacheStr
      );

      options?.onComplete?.({ ...entry, totalInputTokens: totalIn, totalOutputTokens: totalOut });
    },
  };
}

/**
 * Accumulates cost across multiple AI calls in a request.
 * Useful for multi-step generation pipelines.
 *
 * Usage:
 *   const cost = createCostAccumulator();
 *
 *   await streamText({ ...aiLogger('step1', { onComplete: cost.add }), ...withTelemetry({ label: 'step1' }) });
 *   await streamText({ ...aiLogger('step2', { onComplete: cost.add }), ...withTelemetry({ label: 'step2' }) });
 *
 *   console.log(`Total cost: ${cost.total()}`);
 */
export function createCostAccumulator() {
  const entries: LogEntry[] = [];

  return {
    add: (entry: LogEntry) => { entries.push(entry); },
    total: () => {
      const totalIn = entries.reduce((s, e) => s + e.totalInputTokens, 0);
      const totalOut = entries.reduce((s, e) => s + e.totalOutputTokens, 0);
      // Use the last entry's model for cost estimation (approximation)
      const modelId = entries[entries.length - 1]?.modelId || '';
      return estimateCost(modelId, totalIn, totalOut);
    },
    totalFormatted: () => formatCost(
      entries.reduce((s, e) => s + estimateCost(e.modelId || '', e.totalInputTokens, e.totalOutputTokens), 0)
    ),
    summary: () => ({
      calls: entries.length,
      totalInputTokens: entries.reduce((s, e) => s + e.totalInputTokens, 0),
      totalOutputTokens: entries.reduce((s, e) => s + e.totalOutputTokens, 0),
      totalSteps: entries.reduce((s, e) => s + e.steps, 0),
      tools: [...new Set(entries.flatMap(e => e.toolCalls))],
      models: [...new Set(entries.map(e => `${e.provider}/${e.modelId}`))],
    }),
  };
}
