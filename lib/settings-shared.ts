/**
 * Shared types and constants for model settings.
 * Safe to import from both client and server components.
 */

import { LLM_PRICING_OPTIONS } from "@/lib/billing/llm-pricing";
import { STT_PRICING_OPTIONS, type SttPricingOption } from "@/lib/billing/stt-pricing";

export interface ModelSettings {
  /** LLM for summary + intake extraction (AI Gateway format). */
  summaryModel: string;
  /** AssemblyAI batch (pre-recorded) speech model. */
  batchSpeechModel: string;
  /** AssemblyAI streaming (real-time) speech model. */
  streamingSpeechModel: string;
}

export const DEFAULTS: ModelSettings = {
  summaryModel: "anthropic/claude-haiku-4-5",
  batchSpeechModel: "universal-2",
  streamingSpeechModel: "universal-streaming-multilingual",
};

export interface ModelOption {
  value: string;
  label: string;
  /** Price description shown in the UI. */
  price: string;
  sourceUrl?: string;
  sourceLabel?: string;
  provider?: string;
  providerLabel?: string;
  optionId?: string;
}

function formatTokenPrice(input: number, output: number): string {
  return `$${input.toLocaleString("en-US", { maximumFractionDigits: 4 })} / $${output.toLocaleString("en-US", { maximumFractionDigits: 4 })} per 1M tokens`;
}

function speechPrice(option: SttPricingOption): string {
  const suffix = option.addons?.length ? " base" : "";
  return `$${option.ratePerHourUsd.toFixed(option.ratePerHourUsd < 1 ? 2 : 0)}/hr${suffix}`;
}

const runtimeSpeech = STT_PRICING_OPTIONS.filter(
  (option) => option.runtimeStatus === "implemented",
);

const runtimeBatchSpeech = runtimeSpeech.filter(
  (option) => option.provider === "assemblyai" && option.mode === "batch",
);

const runtimeStreamingSpeech = runtimeSpeech.filter(
  (option) => option.mode === "streaming",
);

function speechOption(option: SttPricingOption): ModelOption {
  return {
    value: option.model,
    label: `${option.label} (${option.providerLabel})`,
    price: speechPrice(option),
    sourceUrl: option.sourceUrl,
    sourceLabel: option.providerLabel,
    provider: option.provider,
    providerLabel: option.providerLabel,
    optionId: option.id,
  };
}

export const MODEL_OPTIONS = {
  summary: LLM_PRICING_OPTIONS
    .filter((option) => option.settingsVisible)
    .map((option) => ({
      value: option.modelId,
      label: option.label,
      price: formatTokenPrice(option.pricing.input, option.pricing.output),
      sourceUrl: option.sourceUrl,
      sourceLabel: option.providerLabel,
    })) as ModelOption[],
  batchSpeech: runtimeBatchSpeech.map(speechOption),
  streamingSpeech: runtimeStreamingSpeech.map(speechOption),
} as const;
