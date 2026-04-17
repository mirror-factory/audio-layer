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
  summaryModel: "anthropic/claude-sonnet-4-6",
  batchSpeechModel: "universal-3-pro",
  streamingSpeechModel: "u3-rt-pro",
};

/** Available models for the settings UI. */
export const MODEL_OPTIONS = {
  summary: [
    { value: "anthropic/claude-sonnet-4-6", label: "Claude Sonnet 4.6" },
    { value: "anthropic/claude-haiku-4-5", label: "Claude Haiku 4.5" },
    { value: "openai/gpt-4.1-mini", label: "GPT-4.1 Mini" },
    { value: "openai/gpt-4.1-nano", label: "GPT-4.1 Nano" },
    { value: "google/gemini-2.5-flash", label: "Gemini 2.5 Flash" },
  ],
  batchSpeech: [
    { value: "universal-3-pro", label: "Universal-3 Pro (best quality)" },
    { value: "universal-2", label: "Universal-2 (legacy)" },
    { value: "nano", label: "Nano (fastest, lowest cost)" },
  ],
  streamingSpeech: [
    { value: "u3-rt-pro", label: "Universal-3 Pro RT (best quality)" },
    { value: "u3-rt", label: "Universal-3 RT (standard)" },
  ],
} as const;
