/**
 * AssemblyAI STT pricing and cost estimation.
 * Rates in USD per hour of audio.
 */

import type { SttCostDetail } from "./types";
import { DEFAULTS } from "@/lib/settings-shared";
import { STT_PRICING_OPTIONS } from "@/lib/billing/stt-pricing";

const sttCatalogRates = Object.fromEntries(
  STT_PRICING_OPTIONS
    .map((option) => [`${option.model}:${option.mode}`, option.ratePerHourUsd]),
);

export const BASE_RATES_PER_HOUR: Record<string, number> = {
  "best:batch": 0.21,
  "best:streaming": 0.45,
  "universal-3-pro:batch": 0.21,
  "universal-3-pro:streaming": 0.45,
  "u3-rt-pro:batch": 0.21,
  "u3-rt-pro:streaming": 0.45,
  "u3-pro:streaming": 0.45,
  "nano:batch": 0.12,
  "nano:streaming": 0.15,
  "universal:batch": 0.15,
  "universal:streaming": 0.15,
  "universal-2:batch": 0.15,
  "universal-2:streaming": 0.15,
  "universal-streaming-english:streaming": 0.15,
  "universal-streaming-multilingual:streaming": 0.15,
  "slam-1:batch": 0.21,
  "slam-1:streaming": 0.45,
  "whisper-rt:streaming": 0.30,
  "whisper-streaming:streaming": 0.30,
  ...sttCatalogRates,
};

export const ADDON_PER_HOUR: Record<string, number> = {
  speakerDiarization: 0.02,
  streamingSpeakerDiarization: 0.12,
  summarization: 0.03,
  sentiment: 0.02,
  entityDetection: 0.08,
  topicDetection: 0.15,
  autoChapters: 0.08,
  keyPhrases: 0.01,
  keytermsPrompting: 0.05,
  streamingKeytermsPrompting: 0.04,
  prompting: 0.05,
  piiRedaction: 0.08,
  piiAudioRedaction: 0.05,
  contentModeration: 0.15,
  medicalMode: 0.15,
};

/**
 * Estimate the STT cost for a transcript.
 */
export function estimateTranscriptCost(opts: {
  durationSeconds: number;
  model: string;
  mode: "batch" | "streaming";
  addons?: string[];
}): SttCostDetail {
  const key = `${opts.model}:${opts.mode}`;
  const ratePerHour = BASE_RATES_PER_HOUR[key] ?? 0.21;
  const hours = opts.durationSeconds / 3600;
  const baseCostUsd = hours * ratePerHour;

  let addonCostUsd = 0;
  if (opts.addons) {
    for (const addon of opts.addons) {
      addonCostUsd += hours * (ADDON_PER_HOUR[addon] ?? 0);
    }
  }

  return {
    mode: opts.mode,
    model: opts.model,
    durationSeconds: opts.durationSeconds,
    ratePerHour,
    baseCostUsd,
    addonCostUsd,
    totalCostUsd: baseCostUsd + addonCostUsd,
  };
}

/**
 * Estimate cost for a batch meeting with standard addons
 * (speakerDiarization + entityDetection).
 */
export function estimateBatchMeetingCost(
  durationSeconds: number,
  model: string = DEFAULTS.batchSpeechModel,
): SttCostDetail {
  return estimateTranscriptCost({
    durationSeconds,
    model,
    mode: "batch",
    addons: ["speakerDiarization", "entityDetection"],
  });
}

/**
 * Estimate cost for a streaming meeting.
 * Defaults to the base Universal Streaming route; realtime speaker diarization
 * remains an explicit add-on in pricing config.
 */
export function estimateStreamingMeetingCost(
  durationSeconds: number,
  model: string = DEFAULTS.streamingSpeechModel,
): SttCostDetail {
  return estimateTranscriptCost({
    durationSeconds,
    model,
    mode: "streaming",
    addons: [],
  });
}
