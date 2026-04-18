/**
 * AssemblyAI pricing — USD per hour of audio.
 *
 * Sourced from the April 2026 Voxa reference doc §7 (matches
 * assemblyai.com/pricing at the time of writing). We must compute
 * spend ourselves because AssemblyAI has no billing API — the
 * /v2/transcript response gives us `audio_duration` in seconds, so
 * multiply and go.
 *
 * Review quarterly when AssemblyAI publishes new rates.
 */

export type AssemblyAiMode = "batch" | "streaming";
export type AssemblyAiModel =
  | "best"              // Universal-3 Pro pre-recorded / default batch
  | "universal-3-pro"   // explicit name for Universal-3 Pro batch
  | "u3-rt-pro"         // Universal-3 Pro streaming
  | "u3-rt"             // Universal-3 RT standard
  | "nano"              // Universal-2 (lower tier)
  | "universal"         // Universal-2 legacy
  | "universal-2"       // explicit alias used by the /settings page
  | "slam-1";           // domain-specific

/** USD per hour of audio. */
const BASE_RATES_PER_HOUR: Record<
  `${AssemblyAiModel}:${AssemblyAiMode}`,
  number
> = {
  "best:batch": 0.21,
  "best:streaming": 0.45, // treat streaming-of-best as u3-rt-pro price
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

/** Add-on rates (USD per hour) stacked on top of the base rate. */
export const ADDON_PER_HOUR = {
  speakerDiarization: 0.02,
  summarization: 0.03,
  sentiment: 0.02,
  entityDetection: 0.08,
  topicDetection: 0.15,
  autoChapters: 0.08,
  keyPhrases: 0.01,
  piiRedaction: 0.08,
  contentModeration: 0.15,
} as const;
export type Addon = keyof typeof ADDON_PER_HOUR;

export interface TranscriptCostInput {
  durationSeconds: number;
  model: AssemblyAiModel | string;
  mode: AssemblyAiMode;
  /** Add-ons we enabled on the transcript. Order doesn't matter. */
  addons?: Addon[];
  /** Channels billed separately (dual-channel audio doubles cost). */
  channels?: number;
}

export interface TranscriptCostBreakdown {
  baseCostUsd: number;
  addonCostUsd: number;
  totalCostUsd: number;
  ratePerHour: number;
  billableSeconds: number;
}

function resolveBaseRate(
  model: AssemblyAiModel | string,
  mode: AssemblyAiMode,
): number {
  const key = `${model}:${mode}` as keyof typeof BASE_RATES_PER_HOUR;
  if (BASE_RATES_PER_HOUR[key]) return BASE_RATES_PER_HOUR[key];
  // Fallback: assume best-tier pricing so an unknown model never
  // under-estimates spend. $0.21 batch / $0.45 streaming.
  return mode === "streaming" ? 0.45 : 0.21;
}

export function estimateTranscriptCost(
  input: TranscriptCostInput,
): TranscriptCostBreakdown {
  const channels = Math.max(1, input.channels ?? 1);
  const billableSeconds = Math.max(0, input.durationSeconds) * channels;
  const billableHours = billableSeconds / 3600;
  const ratePerHour = resolveBaseRate(input.model, input.mode);
  const baseCostUsd = billableHours * ratePerHour;
  const addons = input.addons ?? [];
  const addonCostUsd = addons.reduce(
    (acc, a) => acc + (ADDON_PER_HOUR[a] ?? 0) * billableHours,
    0,
  );
  return {
    baseCostUsd,
    addonCostUsd,
    totalCostUsd: baseCostUsd + addonCostUsd,
    ratePerHour,
    billableSeconds,
  };
}

/** Convenience for our standard batch config (speakerLabels + entities). */
export function estimateBatchMeetingCost(
  durationSeconds: number,
  model: AssemblyAiModel | string = "best",
): TranscriptCostBreakdown {
  return estimateTranscriptCost({
    durationSeconds,
    model,
    mode: "batch",
    addons: ["speakerDiarization", "entityDetection"],
  });
}

/** Convenience for our standard streaming config (speakerLabels). */
export function estimateStreamingMeetingCost(
  durationSeconds: number,
  model: AssemblyAiModel | string = "u3-rt-pro",
): TranscriptCostBreakdown {
  return estimateTranscriptCost({
    durationSeconds,
    model,
    mode: "streaming",
    addons: ["speakerDiarization"],
  });
}
