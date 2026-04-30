/**
 * Vendor-neutral speech-to-text pricing catalog and margin helpers.
 *
 * Rates are normalized to USD per hour so pricing scenarios can compare
 * batch and realtime providers without vendor-specific billing shapes.
 */

export type SttMode = "batch" | "streaming";
export type SttRuntimeStatus = "implemented" | "adapter-needed" | "pricing-only";

export interface SttAddonPrice {
  id: string;
  label: string;
  ratePerHourUsd: number;
  included?: boolean;
}

export interface SttPricingOption {
  id: string;
  provider: string;
  providerLabel: string;
  model: string;
  label: string;
  mode: SttMode;
  ratePerHourUsd: number;
  diarization: "included" | "addon" | "unsupported" | "unknown";
  languageCoverage: string;
  latencyProfile: "realtime" | "batch" | "near-realtime";
  qualityProfile: "budget" | "balanced" | "premium" | "compliance";
  sourceUrl: string;
  validatedOn: string;
  notes: string;
  billingUnit?: "audio-hour" | "audio-minute" | "token-equivalent";
  runtimeStatus?: SttRuntimeStatus;
  benchmark?: {
    sourceLabel: string;
    sourceUrl: string;
    metric: string;
    value: string;
    notes: string;
  };
  freeCreditUsd?: number;
  contract?: "free-credit" | "pay-as-you-go" | "commitment" | "enterprise";
  recommendedLane?:
    | "live-default"
    | "cost-candidate"
    | "quality-candidate"
    | "pilot-credit"
    | "batch-fallback"
    | "avoid-on-cost";
  addons?: SttAddonPrice[];
}

export interface SttCostEstimate {
  option: SttPricingOption;
  durationMinutes: number;
  baseCostUsd: number;
  addonCostUsd: number;
  totalCostUsd: number;
  effectiveRatePerHourUsd: number;
}

export interface PricingPlanInput {
  id: string;
  name: string;
  monthlyPriceUsd: number;
  includedMinutes: number;
  expectedMinutes: number;
  overageUsdPerMinute: number;
  meetingLimit?: number | null;
  meetingLimitPeriod?: "lifetime" | "monthly";
  monthlyMinuteLimit?: number | null;
}

export interface PricingAssumptions {
  averageMeetingMinutes: number;
  llmCostPerMeetingUsd: number;
  platformCostPerUserUsd: number;
  supportCostPerUserUsd: number;
  paymentFeePercent: number;
  paymentFixedFeeUsd: number;
  targetMarginPercent: number;
}

export interface PlanEconomics {
  plan: PricingPlanInput;
  sttCostUsd: number;
  llmCostUsd: number;
  platformCostUsd: number;
  supportCostUsd: number;
  paymentCostUsd: number;
  totalCostUsd: number;
  netRevenueUsd: number;
  grossProfitUsd: number;
  grossMarginPercent: number | null;
  breakEvenMinutes: number | null;
  targetPriceUsd: number;
  overageRevenueUsd: number;
}

export interface CustomerMixInput {
  planId: string;
  customers: number;
}

export interface PortfolioPlanEconomics extends PlanEconomics {
  customers: number;
  mrrUsd: number;
  monthlyCostUsd: number;
  monthlyProfitUsd: number;
}

export interface PortfolioEconomics {
  totalCustomers: number;
  payingCustomers: number;
  mrrUsd: number;
  arrUsd: number;
  arpuUsd: number;
  arppuUsd: number;
  monthlyCostUsd: number;
  monthlyProfitUsd: number;
  grossMarginPercent: number | null;
  planRows: PortfolioPlanEconomics[];
}

export const STT_PRICING_VALIDATED_ON = "2026-04-30";

export const STT_PRICING_OPTIONS: SttPricingOption[] = [
  {
    id: "assemblyai:universal-streaming-multilingual:streaming",
    provider: "assemblyai",
    providerLabel: "AssemblyAI",
    model: "universal-streaming-multilingual",
    label: "Universal Streaming Multilingual",
    mode: "streaming",
    ratePerHourUsd: 0.15,
    diarization: "addon",
    languageCoverage: "6 languages",
    latencyProfile: "realtime",
    qualityProfile: "balanced",
    sourceUrl: "https://www.assemblyai.com/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Current live default. Add speaker diarization when speaker labels are enabled.",
    billingUnit: "audio-hour",
    runtimeStatus: "implemented",
    benchmark: {
      sourceLabel: "Pipecat realtime STT eval",
      sourceUrl: "https://www.speechmatics.com/company/articles-and-news/speed-you-can-trust-the-stt-metrics-that-matter-for-voice-agents",
      metric: "semantic WER / TTFS",
      value: "3.02% pooled WER, 256ms median TTFS",
      notes: "Voice-agent benchmark; useful for realtime latency, not meeting diarization quality.",
    },
    freeCreditUsd: 50,
    contract: "free-credit",
    recommendedLane: "live-default",
    addons: [
      { id: "streamingSpeakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "streamingKeyterms", label: "Keyterms prompting", ratePerHourUsd: 0.04 },
    ],
  },
  {
    id: "assemblyai:universal-streaming-english:streaming",
    provider: "assemblyai",
    providerLabel: "AssemblyAI",
    model: "universal-streaming-english",
    label: "Universal Streaming English",
    mode: "streaming",
    ratePerHourUsd: 0.15,
    diarization: "addon",
    languageCoverage: "English",
    latencyProfile: "realtime",
    qualityProfile: "budget",
    sourceUrl: "https://www.assemblyai.com/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Fastest AssemblyAI realtime model for English-only sessions.",
    billingUnit: "audio-hour",
    runtimeStatus: "implemented",
    freeCreditUsd: 50,
    contract: "free-credit",
    addons: [
      { id: "streamingSpeakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "streamingKeyterms", label: "Keyterms prompting", ratePerHourUsd: 0.04 },
    ],
  },
  {
    id: "assemblyai:whisper-rt:streaming",
    provider: "assemblyai",
    providerLabel: "AssemblyAI",
    model: "whisper-rt",
    label: "Whisper Streaming",
    mode: "streaming",
    ratePerHourUsd: 0.3,
    diarization: "addon",
    languageCoverage: "99+ languages",
    latencyProfile: "realtime",
    qualityProfile: "balanced",
    sourceUrl: "https://www.assemblyai.com/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "AssemblyAI-hosted Whisper streaming for languages outside Universal Streaming's native set.",
    billingUnit: "audio-hour",
    runtimeStatus: "implemented",
    freeCreditUsd: 50,
    contract: "free-credit",
    addons: [
      { id: "streamingSpeakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
    ],
  },
  {
    id: "assemblyai:u3-rt-pro:streaming",
    provider: "assemblyai",
    providerLabel: "AssemblyAI",
    model: "u3-rt-pro",
    label: "Universal-3 Pro Streaming",
    mode: "streaming",
    ratePerHourUsd: 0.45,
    diarization: "addon",
    languageCoverage: "6 languages",
    latencyProfile: "realtime",
    qualityProfile: "premium",
    sourceUrl: "https://www.assemblyai.com/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Highest-quality AssemblyAI realtime option; materially higher cost.",
    billingUnit: "audio-hour",
    runtimeStatus: "implemented",
    benchmark: {
      sourceLabel: "Artificial Analysis AA-WER v2",
      sourceUrl: "https://artificialanalysis.ai/articles/aa-wer-v2",
      metric: "AA-AgentTalk WER",
      value: "2.3%",
      notes: "AA-WER v2 reports AssemblyAI Universal-3 Pro second on the voice-agent subset.",
    },
    freeCreditUsd: 50,
    contract: "free-credit",
    recommendedLane: "quality-candidate",
    addons: [
      { id: "streamingSpeakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "prompting", label: "Prompting", ratePerHourUsd: 0.05 },
    ],
  },
  {
    id: "assemblyai:universal-3-pro:batch",
    provider: "assemblyai",
    providerLabel: "AssemblyAI",
    model: "universal-3-pro",
    label: "Universal-3 Pro",
    mode: "batch",
    ratePerHourUsd: 0.21,
    diarization: "addon",
    languageCoverage: "6 languages",
    latencyProfile: "batch",
    qualityProfile: "premium",
    sourceUrl: "https://www.assemblyai.com/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Best pre-recorded AssemblyAI model.",
    billingUnit: "audio-hour",
    runtimeStatus: "implemented",
    freeCreditUsd: 50,
    contract: "free-credit",
    addons: [
      { id: "speakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.02 },
      { id: "entityDetection", label: "Entity detection", ratePerHourUsd: 0.08 },
      { id: "keytermsPrompting", label: "Keyterms prompting", ratePerHourUsd: 0.05 },
    ],
  },
  {
    id: "assemblyai:universal-2:batch",
    provider: "assemblyai",
    providerLabel: "AssemblyAI",
    model: "universal-2",
    label: "Universal-2",
    mode: "batch",
    ratePerHourUsd: 0.15,
    diarization: "addon",
    languageCoverage: "99 languages",
    latencyProfile: "batch",
    qualityProfile: "balanced",
    sourceUrl: "https://www.assemblyai.com/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Current batch default; broad language coverage.",
    billingUnit: "audio-hour",
    runtimeStatus: "implemented",
    freeCreditUsd: 50,
    contract: "free-credit",
    addons: [
      { id: "speakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.02 },
      { id: "entityDetection", label: "Entity detection", ratePerHourUsd: 0.08 },
    ],
  },
  {
    id: "deepgram:nova-3:streaming",
    provider: "deepgram",
    providerLabel: "Deepgram",
    model: "nova-3",
    label: "Nova-3 Monolingual",
    mode: "streaming",
    ratePerHourUsd: 0.288,
    diarization: "addon",
    languageCoverage: "monolingual",
    latencyProfile: "realtime",
    qualityProfile: "premium",
    sourceUrl: "https://deepgram.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Strong realtime alternative; $0.0048/min promotional pay-as-you-go before diarization.",
    billingUnit: "audio-minute",
    runtimeStatus: "implemented",
    benchmark: {
      sourceLabel: "Pipecat realtime STT eval",
      sourceUrl: "https://www.speechmatics.com/company/articles-and-news/speed-you-can-trust-the-stt-metrics-that-matter-for-voice-agents",
      metric: "semantic WER / TTFS",
      value: "1.62% pooled WER, 247ms median TTFS",
      notes: "Strong realtime latency profile; add-on costs matter for meeting diarization.",
    },
    freeCreditUsd: 200,
    contract: "free-credit",
    recommendedLane: "pilot-credit",
    addons: [
      { id: "speakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "keytermPrompting", label: "Keyterm prompting", ratePerHourUsd: 0.078 },
      { id: "redaction", label: "Redaction", ratePerHourUsd: 0.12 },
    ],
  },
  {
    id: "deepgram:flux:streaming",
    provider: "deepgram",
    providerLabel: "Deepgram",
    model: "flux",
    label: "Flux",
    mode: "streaming",
    ratePerHourUsd: 0.39,
    diarization: "addon",
    languageCoverage: "voice-agent model",
    latencyProfile: "realtime",
    qualityProfile: "premium",
    sourceUrl: "https://deepgram.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Conversational realtime model with turn-detection focus; $0.0065/min before add-ons.",
    billingUnit: "audio-minute",
    runtimeStatus: "implemented",
    freeCreditUsd: 200,
    contract: "free-credit",
    recommendedLane: "pilot-credit",
    addons: [
      { id: "speakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "keytermPrompting", label: "Keyterm prompting", ratePerHourUsd: 0.078 },
      { id: "redaction", label: "Redaction", ratePerHourUsd: 0.12 },
    ],
  },
  {
    id: "deepgram:nova-3-multilingual:streaming",
    provider: "deepgram",
    providerLabel: "Deepgram",
    model: "nova-3-multilingual",
    label: "Nova-3 Multilingual",
    mode: "streaming",
    ratePerHourUsd: 0.348,
    diarization: "addon",
    languageCoverage: "multilingual",
    latencyProfile: "realtime",
    qualityProfile: "premium",
    sourceUrl: "https://deepgram.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "$0.0058/min promotional pay-as-you-go before diarization; use for multilingual realtime pilots.",
    billingUnit: "audio-minute",
    runtimeStatus: "implemented",
    freeCreditUsd: 200,
    contract: "free-credit",
    recommendedLane: "pilot-credit",
    addons: [
      { id: "speakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "keytermPrompting", label: "Keyterm prompting", ratePerHourUsd: 0.078 },
      { id: "redaction", label: "Redaction", ratePerHourUsd: 0.12 },
    ],
  },
  {
    id: "deepgram:nova-2:streaming",
    provider: "deepgram",
    providerLabel: "Deepgram",
    model: "nova-2",
    label: "Nova-1/2",
    mode: "streaming",
    ratePerHourUsd: 0.348,
    diarization: "addon",
    languageCoverage: "multi-model",
    latencyProfile: "realtime",
    qualityProfile: "balanced",
    sourceUrl: "https://deepgram.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "$0.0058/min pay-as-you-go before diarization; viable lower-cost realtime fallback.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    freeCreditUsd: 200,
    contract: "free-credit",
    recommendedLane: "pilot-credit",
    addons: [
      { id: "speakerDiarization", label: "Speaker diarization", ratePerHourUsd: 0.12 },
      { id: "keytermPrompting", label: "Keyterm prompting", ratePerHourUsd: 0.078 },
      { id: "redaction", label: "Redaction", ratePerHourUsd: 0.12 },
    ],
  },
  {
    id: "soniox:realtime:streaming",
    provider: "soniox",
    providerLabel: "Soniox",
    model: "realtime",
    label: "Realtime STT",
    mode: "streaming",
    ratePerHourUsd: 0.12,
    diarization: "unknown",
    languageCoverage: "multilingual",
    latencyProfile: "realtime",
    qualityProfile: "budget",
    sourceUrl: "https://soniox.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Lowest public realtime rate found; token-equivalent pricing is advertised as about $0.12/hr.",
    billingUnit: "token-equivalent",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "cost-candidate",
  },
  {
    id: "soniox:async:batch",
    provider: "soniox",
    providerLabel: "Soniox",
    model: "async",
    label: "Async File STT",
    mode: "batch",
    ratePerHourUsd: 0.1,
    diarization: "unknown",
    languageCoverage: "multilingual",
    latencyProfile: "batch",
    qualityProfile: "budget",
    sourceUrl: "https://soniox.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Token-equivalent async pricing advertised as about $0.10/hr.",
    billingUnit: "token-equivalent",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "cost-candidate",
  },
  {
    id: "elevenlabs:scribe-v2-realtime:streaming",
    provider: "elevenlabs",
    providerLabel: "ElevenLabs",
    model: "scribe-v2-realtime",
    label: "Scribe v2 Realtime",
    mode: "streaming",
    ratePerHourUsd: 0.39,
    diarization: "unknown",
    languageCoverage: "90+ languages",
    latencyProfile: "realtime",
    qualityProfile: "premium",
    sourceUrl: "https://elevenlabs.io/pricing/api",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Realtime STT API price; separate annual Business plan page advertises lower negotiated rates.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "quality-candidate",
    benchmark: {
      sourceLabel: "Artificial Analysis AA-WER v2",
      sourceUrl: "https://artificialanalysis.ai/articles/aa-wer-v2",
      metric: "overall AA-WER",
      value: "2.3%",
      notes: "Independent benchmark ranked Scribe v2 first overall across its weighted suite.",
    },
  },
  {
    id: "elevenlabs:scribe-v2:batch",
    provider: "elevenlabs",
    providerLabel: "ElevenLabs",
    model: "scribe-v2",
    label: "Scribe v2",
    mode: "batch",
    ratePerHourUsd: 0.22,
    diarization: "unknown",
    languageCoverage: "90+ languages",
    latencyProfile: "batch",
    qualityProfile: "premium",
    sourceUrl: "https://elevenlabs.io/pricing/api",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "High-accuracy batch transcription candidate at $0.22/hr.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "quality-candidate",
  },
  {
    id: "revai:reverb:batch",
    provider: "revai",
    providerLabel: "Rev AI",
    model: "reverb",
    label: "Reverb Transcription",
    mode: "batch",
    ratePerHourUsd: 0.2,
    diarization: "unknown",
    languageCoverage: "English",
    latencyProfile: "batch",
    qualityProfile: "balanced",
    sourceUrl: "https://www.rev.ai/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Rev AI's Reverb ASR public rate; useful as a low-cost English batch benchmark.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    freeCreditUsd: 1,
    contract: "free-credit",
    recommendedLane: "batch-fallback",
  },
  {
    id: "revai:reverb-turbo:batch",
    provider: "revai",
    providerLabel: "Rev AI",
    model: "reverb-turbo",
    label: "Reverb Turbo Transcription",
    mode: "batch",
    ratePerHourUsd: 0.1,
    diarization: "unknown",
    languageCoverage: "English",
    latencyProfile: "batch",
    qualityProfile: "budget",
    sourceUrl: "https://www.rev.ai/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Lowest Rev AI Reverb rate; quality needs a meeting-domain evaluation before production use.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "cost-candidate",
  },
  {
    id: "google:speech-v2-standard:streaming",
    provider: "google",
    providerLabel: "Google Cloud",
    model: "speech-v2-standard",
    label: "Speech-to-Text V2 Standard",
    mode: "streaming",
    ratePerHourUsd: 0.96,
    diarization: "unknown",
    languageCoverage: "model dependent",
    latencyProfile: "realtime",
    qualityProfile: "compliance",
    sourceUrl: "https://cloud.google.com/speech-to-text/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "First-tier V2 standard recognition rate: $0.016/min up to 500k minutes.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "avoid-on-cost",
  },
  {
    id: "gladia:growth-realtime:streaming",
    provider: "gladia",
    providerLabel: "Gladia",
    model: "growth-realtime",
    label: "Growth Realtime",
    mode: "streaming",
    ratePerHourUsd: 0.25,
    diarization: "included",
    languageCoverage: "100+ languages",
    latencyProfile: "realtime",
    qualityProfile: "balanced",
    sourceUrl: "https://support.gladia.io/article/understanding-our-transcription-pricing-pv1atikh8y9c8sw7sudm3rcy",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Starting Growth rate with usage commitment; Starter realtime is $0.75/hr.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    contract: "commitment",
  },
  {
    id: "gladia:starter-realtime:streaming",
    provider: "gladia",
    providerLabel: "Gladia",
    model: "starter-realtime",
    label: "Starter Realtime",
    mode: "streaming",
    ratePerHourUsd: 0.75,
    diarization: "included",
    languageCoverage: "100+ languages",
    latencyProfile: "realtime",
    qualityProfile: "balanced",
    sourceUrl: "https://support.gladia.io/article/understanding-our-transcription-pricing-pv1atikh8y9c8sw7sudm3rcy",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Pay-as-you-go realtime with core capabilities bundled.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
  },
  {
    id: "speechmatics:pro:streaming",
    provider: "speechmatics",
    providerLabel: "Speechmatics",
    model: "pro",
    label: "Pro STT",
    mode: "streaming",
    ratePerHourUsd: 0.24,
    diarization: "unknown",
    languageCoverage: "55+ languages",
    latencyProfile: "near-realtime",
    qualityProfile: "balanced",
    sourceUrl: "https://www.speechmatics.com/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "Public page says from $0.24/hr; billable usage above 500h gets volume discounts.",
    billingUnit: "audio-hour",
    runtimeStatus: "adapter-needed",
    benchmark: {
      sourceLabel: "Pipecat realtime STT eval",
      sourceUrl: "https://www.speechmatics.com/company/articles-and-news/speed-you-can-trust-the-stt-metrics-that-matter-for-voice-agents",
      metric: "semantic WER / TTFS",
      value: "1.07% pooled WER, 495ms median TTFS",
      notes: "Best pooled WER in the cited Pipecat realtime table, with higher median latency than Deepgram/AssemblyAI.",
    },
    contract: "pay-as-you-go",
    recommendedLane: "quality-candidate",
  },
  {
    id: "openai:gpt-4o-mini-transcribe:batch",
    provider: "openai",
    providerLabel: "OpenAI",
    model: "gpt-4o-mini-transcribe",
    label: "GPT-4o Mini Transcribe",
    mode: "batch",
    ratePerHourUsd: 0.18,
    diarization: "unsupported",
    languageCoverage: "multilingual",
    latencyProfile: "batch",
    qualityProfile: "balanced",
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "$0.003/min estimated transcription cost; no built-in meeting diarization.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "batch-fallback",
  },
  {
    id: "openai:gpt-4o-transcribe:batch",
    provider: "openai",
    providerLabel: "OpenAI",
    model: "gpt-4o-transcribe",
    label: "GPT-4o Transcribe",
    mode: "batch",
    ratePerHourUsd: 0.36,
    diarization: "unsupported",
    languageCoverage: "multilingual",
    latencyProfile: "batch",
    qualityProfile: "premium",
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "$0.006/min estimated transcription cost; useful as batch fallback.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "batch-fallback",
  },
  {
    id: "openai:gpt-4o-transcribe-diarize:batch",
    provider: "openai",
    providerLabel: "OpenAI",
    model: "gpt-4o-transcribe-diarize",
    label: "GPT-4o Transcribe Diarize",
    mode: "batch",
    ratePerHourUsd: 0.36,
    diarization: "included",
    languageCoverage: "multilingual",
    latencyProfile: "batch",
    qualityProfile: "premium",
    sourceUrl: "https://developers.openai.com/api/docs/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "$0.006/min estimated transcription cost with diarization model pricing listed by OpenAI.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "batch-fallback",
  },
  {
    id: "google:speech-v2-dynamic-batch:batch",
    provider: "google",
    providerLabel: "Google Cloud",
    model: "speech-v2-dynamic-batch",
    label: "Speech-to-Text V2 Dynamic Batch",
    mode: "batch",
    ratePerHourUsd: 0.18,
    diarization: "included",
    languageCoverage: "model dependent",
    latencyProfile: "batch",
    qualityProfile: "budget",
    sourceUrl: "https://cloud.google.com/speech-to-text/pricing",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "$0.003/min dynamic batch; not a live meeting default.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "batch-fallback",
  },
  {
    id: "aws:transcribe-standard:streaming",
    provider: "aws",
    providerLabel: "AWS",
    model: "transcribe-standard",
    label: "Transcribe Standard",
    mode: "streaming",
    ratePerHourUsd: 1.44,
    diarization: "included",
    languageCoverage: "multi-language",
    latencyProfile: "realtime",
    qualityProfile: "compliance",
    sourceUrl: "https://aws.amazon.com/transcribe/pricing/",
    validatedOn: STT_PRICING_VALIDATED_ON,
    notes: "US East tier 1 rate, $0.024/min; usually not cost-effective for this app.",
    billingUnit: "audio-minute",
    runtimeStatus: "adapter-needed",
    contract: "pay-as-you-go",
    recommendedLane: "avoid-on-cost",
  },
];

export const DEFAULT_PRICING_ASSUMPTIONS: PricingAssumptions = {
  averageMeetingMinutes: 30,
  llmCostPerMeetingUsd: 0.004,
  platformCostPerUserUsd: 0.75,
  supportCostPerUserUsd: 0.5,
  paymentFeePercent: 2.9,
  paymentFixedFeeUsd: 0.3,
  targetMarginPercent: 75,
};

export const DEFAULT_PRICING_PLANS: PricingPlanInput[] = [
  {
    id: "free",
    name: "Free",
    monthlyPriceUsd: 0,
    includedMinutes: 120,
    expectedMinutes: 60,
    overageUsdPerMinute: 0,
    meetingLimit: 25,
    meetingLimitPeriod: "lifetime",
    monthlyMinuteLimit: 120,
  },
  {
    id: "core",
    name: "Core",
    monthlyPriceUsd: 20,
    includedMinutes: 600,
    expectedMinutes: 600,
    overageUsdPerMinute: 0.02,
    meetingLimit: null,
    meetingLimitPeriod: "monthly",
    monthlyMinuteLimit: 600,
  },
  {
    id: "pro",
    name: "Pro",
    monthlyPriceUsd: 30,
    includedMinutes: 1500,
    expectedMinutes: 1200,
    overageUsdPerMinute: 0.015,
    meetingLimit: null,
    meetingLimitPeriod: "monthly",
    monthlyMinuteLimit: 1500,
  },
];

export const DEFAULT_CUSTOMER_MIX: CustomerMixInput[] = [
  { planId: "free", customers: 250 },
  { planId: "core", customers: 650 },
  { planId: "pro", customers: 100 },
];

export function sttCostPerMinute(option: SttPricingOption, addonIds: string[] = []): number {
  const addonRate = option.addons
    ?.filter((addon) => addonIds.includes(addon.id))
    .reduce((sum, addon) => sum + addon.ratePerHourUsd, 0) ?? 0;
  return (option.ratePerHourUsd + addonRate) / 60;
}

export function estimateSttCost(opts: {
  optionId: string;
  durationMinutes: number;
  addonIds?: string[];
}): SttCostEstimate {
  const option = STT_PRICING_OPTIONS.find((item) => item.id === opts.optionId);
  if (!option) {
    throw new Error(`Unknown STT pricing option: ${opts.optionId}`);
  }

  const addonRate = option.addons
    ?.filter((addon) => opts.addonIds?.includes(addon.id))
    .reduce((sum, addon) => sum + addon.ratePerHourUsd, 0) ?? 0;
  const hours = opts.durationMinutes / 60;
  const baseCostUsd = hours * option.ratePerHourUsd;
  const addonCostUsd = hours * addonRate;

  return {
    option,
    durationMinutes: opts.durationMinutes,
    baseCostUsd,
    addonCostUsd,
    totalCostUsd: baseCostUsd + addonCostUsd,
    effectiveRatePerHourUsd: option.ratePerHourUsd + addonRate,
  };
}

export function estimatePlanEconomics(opts: {
  plan: PricingPlanInput;
  sttOptionId: string;
  addonIds?: string[];
  assumptions: PricingAssumptions;
}): PlanEconomics {
  const stt = estimateSttCost({
    optionId: opts.sttOptionId,
    durationMinutes: opts.plan.expectedMinutes,
    addonIds: opts.addonIds,
  });
  const meetingsPerMonth = opts.assumptions.averageMeetingMinutes > 0
    ? opts.plan.expectedMinutes / opts.assumptions.averageMeetingMinutes
    : 0;
  const llmCostUsd = meetingsPerMonth * opts.assumptions.llmCostPerMeetingUsd;
  const overageMinutes = Math.max(0, opts.plan.expectedMinutes - opts.plan.includedMinutes);
  const overageRevenueUsd = overageMinutes * opts.plan.overageUsdPerMinute;
  const grossRevenueUsd = opts.plan.monthlyPriceUsd + overageRevenueUsd;
  const paymentCostUsd = grossRevenueUsd > 0
    ? grossRevenueUsd * (opts.assumptions.paymentFeePercent / 100) + opts.assumptions.paymentFixedFeeUsd
    : 0;
  const netRevenueUsd = grossRevenueUsd - paymentCostUsd;
  const platformCostUsd = opts.assumptions.platformCostPerUserUsd;
  const supportCostUsd = opts.assumptions.supportCostPerUserUsd;
  const totalCostUsd = stt.totalCostUsd + llmCostUsd + platformCostUsd + supportCostUsd + paymentCostUsd;
  const grossProfitUsd = grossRevenueUsd - totalCostUsd;
  const grossMarginPercent = grossRevenueUsd > 0 ? (grossProfitUsd / grossRevenueUsd) * 100 : null;
  const variableCostPerMinute = stt.effectiveRatePerHourUsd / 60
    + opts.assumptions.llmCostPerMeetingUsd / Math.max(1, opts.assumptions.averageMeetingMinutes);
  const fixedCostUsd = platformCostUsd + supportCostUsd + paymentCostUsd;
  const breakEvenMinutes = variableCostPerMinute > 0 && netRevenueUsd > fixedCostUsd
    ? (netRevenueUsd - fixedCostUsd) / variableCostPerMinute
    : null;
  const targetMargin = Math.min(0.95, Math.max(0, opts.assumptions.targetMarginPercent / 100));
  const targetPriceUsd = targetMargin < 1
    ? (stt.totalCostUsd + llmCostUsd + platformCostUsd + supportCostUsd + opts.assumptions.paymentFixedFeeUsd)
      / Math.max(0.01, (1 - targetMargin - opts.assumptions.paymentFeePercent / 100))
    : grossRevenueUsd;

  return {
    plan: opts.plan,
    sttCostUsd: stt.totalCostUsd,
    llmCostUsd,
    platformCostUsd,
    supportCostUsd,
    paymentCostUsd,
    totalCostUsd,
    netRevenueUsd,
    grossProfitUsd,
    grossMarginPercent,
    breakEvenMinutes,
    targetPriceUsd,
    overageRevenueUsd,
  };
}

export function estimatePortfolioEconomics(opts: {
  plans: PricingPlanInput[];
  customerMix: CustomerMixInput[];
  sttOptionId: string;
  addonIds?: string[];
  assumptions: PricingAssumptions;
}): PortfolioEconomics {
  const planRows = opts.customerMix.map((mix) => {
    const plan = opts.plans.find((item) => item.id === mix.planId);
    if (!plan) {
      throw new Error(`Unknown plan in customer mix: ${mix.planId}`);
    }

    const economics = estimatePlanEconomics({
      plan,
      sttOptionId: opts.sttOptionId,
      addonIds: opts.addonIds,
      assumptions: opts.assumptions,
    });
    const customers = Math.max(0, mix.customers);

    return {
      ...economics,
      customers,
      mrrUsd: plan.monthlyPriceUsd * customers + economics.overageRevenueUsd * customers,
      monthlyCostUsd: economics.totalCostUsd * customers,
      monthlyProfitUsd: economics.grossProfitUsd * customers,
    };
  });

  const totalCustomers = planRows.reduce((sum, row) => sum + row.customers, 0);
  const payingCustomers = planRows
    .filter((row) => row.plan.monthlyPriceUsd > 0)
    .reduce((sum, row) => sum + row.customers, 0);
  const mrrUsd = planRows.reduce((sum, row) => sum + row.mrrUsd, 0);
  const monthlyCostUsd = planRows.reduce((sum, row) => sum + row.monthlyCostUsd, 0);
  const monthlyProfitUsd = planRows.reduce((sum, row) => sum + row.monthlyProfitUsd, 0);

  return {
    totalCustomers,
    payingCustomers,
    mrrUsd,
    arrUsd: mrrUsd * 12,
    arpuUsd: totalCustomers > 0 ? mrrUsd / totalCustomers : 0,
    arppuUsd: payingCustomers > 0 ? mrrUsd / payingCustomers : 0,
    monthlyCostUsd,
    monthlyProfitUsd,
    grossMarginPercent: mrrUsd > 0 ? (monthlyProfitUsd / mrrUsd) * 100 : null,
    planRows,
  };
}

export function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: value < 10 ? 2 : 0,
    maximumFractionDigits: value < 10 ? 3 : 0,
  }).format(value);
}
