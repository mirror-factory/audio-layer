/**
 * AssemblyAI STT pricing and cost estimation.
 * Rates in USD per hour of audio.
 */

import type { SttCostDetail } from "./types";

export const BASE_RATES_PER_HOUR: Record<string, number> = {
  "best:batch": 0.21,
  "best:streaming": 0.45,
  "universal-3-pro:batch": 0.21,
  "universal-3-pro:streaming": 0.45,
  "u3-rt-pro:batch": 0.21,
  "u3-rt-pro:streaming": 0.45,
  "u3-rt:batch": 0.15,
  "u3-rt:streaming": 0.26,
  "nano:batch": 0.15,
  "nano:streaming": 0.15,
  "universal:batch": 0.15,
  "universal:streaming": 0.15,
  "universal-2:batch": 0.15,
  "universal-2:streaming": 0.15,
  "slam-1:batch": 0.21,
  "slam-1:streaming": 0.45,
};

export const ADDON_PER_HOUR: Record<string, number> = {
  speakerDiarization: 0.02,
  summarization: 0.03,
  sentiment: 0.02,
  entityDetection: 0.08,
  topicDetection: 0.15,
  autoChapters: 0.08,
  keyPhrases: 0.01,
  piiRedaction: 0.08,
  contentModeration: 0.15,
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
  model: string = "universal-3-pro",
): SttCostDetail {
  return estimateTranscriptCost({
    durationSeconds,
    model,
    mode: "batch",
    addons: ["speakerDiarization", "entityDetection"],
  });
}

/**
 * Estimate cost for a streaming meeting (no add-ons in streaming mode).
 */
export function estimateStreamingMeetingCost(
  durationSeconds: number,
  model: string = "u3-rt-pro",
): SttCostDetail {
  return estimateTranscriptCost({
    durationSeconds,
    model,
    mode: "streaming",
  });
}
