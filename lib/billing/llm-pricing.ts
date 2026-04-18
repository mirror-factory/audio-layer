/**
 * LLM pricing tables and helpers.
 *
 * Extracted from lib/ai/ai-logger.ts so both the logger and the billing
 * code share the same source of truth. Prices are USD per 1M tokens.
 * Cached input tokens bill at ~10% of input for Anthropic / Gemini — we
 * apply that multiplier when a call reports cachedInputTokens.
 *
 * Update these when a provider publishes new rates. Until we wire a
 * live price feed, manual bumps are the discipline.
 */

export interface ModelPricing {
  /** USD per 1M input tokens */
  input: number;
  /** USD per 1M output tokens */
  output: number;
  /** USD per 1M cached input tokens (defaults to input * 0.1) */
  cachedInput?: number;
}

export const COST_PER_M_TOKENS: Record<string, ModelPricing> = {
  // Google Gemini
  "gemini-3-flash": { input: 0.5, output: 3.0 },
  "gemini-3-flash-preview": { input: 0.5, output: 3.0 },
  "gemini-3.1-pro-preview": { input: 2.0, output: 12.0 },
  "gemini-3.1-flash-lite-preview": { input: 0.25, output: 1.5 },
  "gemini-2.5-flash": { input: 0.15, output: 0.6 },
  "gemini-3.1-flash-image-preview": { input: 0.5, output: 3.0 },
  "gemini-3-pro-image-preview": { input: 2.0, output: 12.0 },
  // Anthropic
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-opus-4-6": { input: 15.0, output: 75.0, cachedInput: 1.5 },
  "claude-haiku-4-5": { input: 0.8, output: 4.0, cachedInput: 0.08 },
  // OpenAI
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
};

/** Default fallback when the model id doesn't match anything in the table. */
const DEFAULT_PRICING: ModelPricing = { input: 1.0, output: 3.0 };

/**
 * Strip the provider prefix (e.g. "anthropic/claude-sonnet-4-6" →
 * "claude-sonnet-4-6") so Gateway-style model strings find their row.
 */
export function stripModelPrefix(modelId: string): string {
  if (!modelId) return "";
  return modelId.includes("/")
    ? (modelId.split("/").pop() ?? modelId)
    : modelId;
}

/** Look up pricing for a model id, with partial-match fallback. */
export function pricingForModel(modelId: string): ModelPricing {
  const bare = stripModelPrefix(modelId);
  if (!bare) return DEFAULT_PRICING;
  const exact = COST_PER_M_TOKENS[bare];
  if (exact) return exact;
  const partial = Object.entries(COST_PER_M_TOKENS).find(([k]) =>
    bare.includes(k),
  )?.[1];
  return partial ?? DEFAULT_PRICING;
}

export interface LlmUsage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
}

/** Compute USD cost for a single LLM call. */
export function estimateLlmCost(
  modelId: string,
  usage: LlmUsage,
): number {
  const p = pricingForModel(modelId);
  const cachedRate = p.cachedInput ?? p.input * 0.1;
  const cachedIn = usage.cachedInputTokens ?? 0;
  const freshIn = Math.max(0, usage.inputTokens - cachedIn);
  return (
    (freshIn * p.input +
      cachedIn * cachedRate +
      usage.outputTokens * p.output) /
    1_000_000
  );
}

/**
 * Format a USD cost with sensible precision:
 *   < $0.001  → milli-dollars ("$0.150m")
 *   < $0.01   → 4 decimals
 *   else      → 3 decimals
 */
export function formatUsd(cost: number): string {
  if (!Number.isFinite(cost) || cost <= 0) return "$0.000";
  if (cost < 0.001) return `$${(cost * 1000).toFixed(3)}m`;
  if (cost < 0.01) return `$${cost.toFixed(4)}`;
  if (cost < 100) return `$${cost.toFixed(3)}`;
  return `$${cost.toFixed(2)}`;
}
