/**
 * Shared types and constants for model settings.
 * Safe to import from both client and server components.
 */

export interface ModelSettings {
  /** LLM for summary + intake extraction (AI Gateway format). */
  summaryModel: string;
  /** AssemblyAI batch (pre-recorded) speech model. */
  batchSpeechModel: string;
  /** AssemblyAI streaming (real-time) speech model. */
  streamingSpeechModel: string;
}

export const DEFAULTS: ModelSettings = {
  summaryModel: "openai/gpt-5.4-nano",
  batchSpeechModel: "universal-3-pro",
  streamingSpeechModel: "u3-rt-pro",
};

export interface ModelOption {
  value: string;
  label: string;
  /** Price description shown in the UI. */
  price: string;
}

/** Available models for the settings UI — latest 3 from each provider. */
export const MODEL_OPTIONS = {
  summary: [
    // Anthropic (April 2026)
    { value: "anthropic/claude-opus-4-7", label: "Claude Opus 4.7", price: "$5 / $25 per 1M tokens" },
    { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6", price: "$3 / $15 per 1M tokens" },
    { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5", price: "$1 / $5 per 1M tokens" },
    // OpenAI (April 2026)
    { value: "openai/gpt-4.1", label: "GPT-4.1", price: "$2 / $8 per 1M tokens" },
    { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini", price: "$0.40 / $1.60 per 1M tokens" },
    { value: "openai/o4-mini", label: "o4-mini (reasoning)", price: "$1.10 / $4.40 per 1M tokens" },
    // Google (April 2026)
    { value: "google/gemini-2.5-pro", label: "Gemini 2.5 Pro", price: "$1.25 / $10 per 1M tokens" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash", price: "$0.30 / $2.50 per 1M tokens" },
    { value: "google/gemini-2.0-flash", label: "Gemini 2.0 Flash", price: "$0.10 / $0.40 per 1M tokens" },
  ] as ModelOption[],
  batchSpeech: [
    { value: "universal-3-pro", label: "Universal-3 Pro", price: "$0.21/hr + addons" },
    { value: "universal-2", label: "Universal-2", price: "$0.15/hr + addons" },
    { value: "nano", label: "Nano", price: "$0.09/hr" },
  ] as ModelOption[],
  streamingSpeech: [
    { value: "u3-rt-pro", label: "Universal-3 Pro RT (best quality)", price: "$0.45/hr" },
    { value: "u3-rt-agent", label: "Universal-3 RT Agent (low latency)", price: "$0.45/hr" },
    { value: "universal-streaming-multilingual", label: "Universal Streaming (multilingual)", price: "$0.15/hr" },
    { value: "universal-streaming-english", label: "Universal Streaming (English only)", price: "$0.15/hr" },
  ] as ModelOption[],
} as const;
