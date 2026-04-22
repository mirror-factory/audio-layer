/**
 * LLM pricing table and cost estimation.
 * Prices in USD per 1M tokens.
 */

export interface ModelPricing {
  input: number;
  output: number;
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
  "claude-opus-4-7": { input: 5.0, output: 25.0, cachedInput: 0.5 },
  "claude-sonnet-4-6": { input: 3.0, output: 15.0, cachedInput: 0.3 },
  "claude-opus-4-6": { input: 5.0, output: 25.0, cachedInput: 0.5 },
  "claude-haiku-4-5": { input: 1.0, output: 5.0, cachedInput: 0.1 },
  // OpenAI
  "gpt-5.4-nano": { input: 0.2, output: 1.25 },
  "gpt-4.1": { input: 2.0, output: 8.0 },
  "gpt-4.1-mini": { input: 0.4, output: 1.6 },
  "gpt-4.1-nano": { input: 0.1, output: 0.4 },
  "o4-mini": { input: 1.1, output: 4.4 },
  // Google
  "gemini-2.5-pro": { input: 1.25, output: 10.0, cachedInput: 0.125 },
  "gemini-2.0-flash": { input: 0.1, output: 0.4, cachedInput: 0.01 },
  // OpenAI Embeddings
  "text-embedding-3-small": { input: 0.02, output: 0 },
  "text-embedding-3-large": { input: 0.13, output: 0 },
};

/**
 * Strip provider prefix from a model ID.
 * "anthropic/claude-sonnet-4-6" -> "claude-sonnet-4-6"
 */
export function stripModelPrefix(modelId: string): string {
  const slashIdx = modelId.indexOf("/");
  return slashIdx >= 0 ? modelId.slice(slashIdx + 1) : modelId;
}

/**
 * Look up pricing for a model ID (with or without provider prefix).
 */
export function pricingForModel(modelId: string): ModelPricing | null {
  const bare = stripModelPrefix(modelId);
  return COST_PER_M_TOKENS[bare] ?? null;
}

/**
 * Estimate the USD cost for an LLM call.
 */
export function estimateLlmCost(
  modelId: string,
  tokens: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  },
): number {
  const pricing = pricingForModel(modelId);
  if (!pricing) return 0;

  const cachedInput = tokens.cachedInputTokens ?? 0;
  const nonCachedInput = tokens.inputTokens - cachedInput;

  let cost = 0;
  cost += (nonCachedInput * pricing.input) / 1_000_000;
  cost += (tokens.outputTokens * pricing.output) / 1_000_000;

  if (cachedInput > 0 && pricing.cachedInput) {
    cost += (cachedInput * pricing.cachedInput) / 1_000_000;
  } else if (cachedInput > 0) {
    // No cached rate — bill cached tokens at ~10% of input rate
    cost += (cachedInput * pricing.input * 0.1) / 1_000_000;
  }

  return cost;
}

/**
 * Estimate the USD cost for embedding a given number of tokens
 * using text-embedding-3-small.
 */
export function estimateEmbeddingCost(tokenCount: number): number {
  const pricing = COST_PER_M_TOKENS["text-embedding-3-small"];
  if (!pricing) return 0;
  return (tokenCount * pricing.input) / 1_000_000;
}

/**
 * Format a USD amount for display.
 */
export function formatUsd(amount: number): string {
  if (amount < 0.01) {
    return `$${amount.toFixed(4)}`;
  }
  return `$${amount.toFixed(2)}`;
}
