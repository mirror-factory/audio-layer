/**
 * LLM pricing table and cost estimation.
 * Prices in USD per 1M tokens.
 */

export interface ModelPricing {
  input: number;
  output: number;
  cachedInput?: number;
}

export interface LlmPricingOption {
  modelId: string;
  provider: "anthropic" | "google" | "openai";
  providerLabel: string;
  label: string;
  pricing: ModelPricing;
  sourceUrl: string;
  validatedOn: string;
  settingsVisible?: boolean;
  notes?: string;
}

export const LLM_PRICING_VALIDATED_ON = "2026-04-26";

export const LLM_PRICING_OPTIONS: LlmPricingOption[] = [
  {
    modelId: "openai/gpt-5.4-nano",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "GPT-5.4 Nano",
    pricing: { input: 0.2, output: 1.25, cachedInput: 0.02 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
    notes: "Default low-cost intake model.",
  },
  {
    modelId: "openai/gpt-5.4-mini",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "GPT-5.4 Mini",
    pricing: { input: 0.75, output: 4.5, cachedInput: 0.075 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "openai/gpt-5.4",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "GPT-5.4",
    pricing: { input: 2.5, output: 15, cachedInput: 0.25 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "openai/gpt-4.1",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "GPT-4.1",
    pricing: { input: 2.0, output: 8.0 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "openai/gpt-4.1-mini",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "GPT-4.1 Mini",
    pricing: { input: 0.4, output: 1.6 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "openai/o4-mini",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "o4-mini",
    pricing: { input: 1.1, output: 4.4 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "anthropic/claude-opus-4-7",
    provider: "anthropic",
    providerLabel: "Anthropic",
    label: "Claude Opus 4.7",
    pricing: { input: 5.0, output: 25.0, cachedInput: 0.5 },
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "anthropic/claude-sonnet-4-6",
    provider: "anthropic",
    providerLabel: "Anthropic",
    label: "Claude Sonnet 4.6",
    pricing: { input: 3.0, output: 15.0, cachedInput: 0.3 },
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "anthropic/claude-opus-4-6",
    provider: "anthropic",
    providerLabel: "Anthropic",
    label: "Claude Opus 4.6",
    pricing: { input: 5.0, output: 25.0, cachedInput: 0.5 },
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "anthropic/claude-haiku-4-5",
    provider: "anthropic",
    providerLabel: "Anthropic",
    label: "Claude Haiku 4.5",
    pricing: { input: 1.0, output: 5.0, cachedInput: 0.1 },
    sourceUrl: "https://platform.claude.com/docs/en/about-claude/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "google/gemini-2.5-pro",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 2.5 Pro",
    pricing: { input: 1.25, output: 10.0, cachedInput: 0.125 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "google/gemini-2.5-flash",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 2.5 Flash",
    pricing: { input: 0.3, output: 2.5, cachedInput: 0.03 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "google/gemini-2.5-flash-lite",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 2.5 Flash-Lite",
    pricing: { input: 0.1, output: 0.4, cachedInput: 0.01 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "google/gemini-2.0-flash",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 2.0 Flash",
    pricing: { input: 0.1, output: 0.4, cachedInput: 0.01 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: true,
  },
  {
    modelId: "google/gemini-3-flash",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 3 Flash",
    pricing: { input: 0.5, output: 3.0 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "google/gemini-3.1-pro-preview",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 3.1 Pro Preview",
    pricing: { input: 2.0, output: 12.0 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "google/gemini-3.1-flash-lite-preview",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 3.1 Flash-Lite Preview",
    pricing: { input: 0.25, output: 1.5 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "google/gemini-3.1-flash-image-preview",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 3.1 Flash Image Preview",
    pricing: { input: 0.5, output: 3.0 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "google/gemini-3-pro-image-preview",
    provider: "google",
    providerLabel: "Google",
    label: "Gemini 3 Pro Image Preview",
    pricing: { input: 2.0, output: 12.0 },
    sourceUrl: "https://ai.google.dev/gemini-api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "openai/text-embedding-3-small",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "Text Embedding 3 Small",
    pricing: { input: 0.02, output: 0 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
  {
    modelId: "openai/text-embedding-3-large",
    provider: "openai",
    providerLabel: "OpenAI",
    label: "Text Embedding 3 Large",
    pricing: { input: 0.13, output: 0 },
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: LLM_PRICING_VALIDATED_ON,
    settingsVisible: false,
  },
];

export const COST_PER_M_TOKENS: Record<string, ModelPricing> = Object.fromEntries(
  LLM_PRICING_OPTIONS.map((option) => [stripModelPrefix(option.modelId), option.pricing]),
);

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
