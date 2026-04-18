/**
 * Shared shapes for per-meeting cost tracking + /usage aggregation.
 *
 * Persisted on `meetings.cost_breakdown` jsonb. Round-tripped through
 * both MeetingsStore implementations (in-memory + Supabase).
 */

export interface LlmCallRecord {
  /** Semantic label matching withTelemetry({ label }) — e.g. "meeting-summary". */
  label: string;
  /** Full model id including provider prefix (e.g. "anthropic/claude-sonnet-4-6"). */
  model: string;
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens?: number;
  /** Computed locally from COST_PER_M_TOKENS; USD. */
  costUsd: number;
}

export interface SttCostDetail {
  mode: "batch" | "streaming";
  /** AssemblyAI speech_model (or our streaming model id) used for this meeting. */
  model: string;
  durationSeconds: number;
  ratePerHour: number;
  baseCostUsd: number;
  addonCostUsd: number;
  totalCostUsd: number;
}

export interface LlmCostDetail {
  totalInputTokens: number;
  totalOutputTokens: number;
  totalCostUsd: number;
  calls: LlmCallRecord[];
}

export interface MeetingCostBreakdown {
  stt: SttCostDetail;
  llm: LlmCostDetail;
  totalCostUsd: number;
}

export interface UsageSummary {
  meetings: {
    total: number;
    thisMonth: number;
    freeLimit: number;
    freeRemaining: number;
  };
  minutes: {
    total: number;
    thisMonth: number;
  };
  stt: {
    totalCostUsd: number;
    thisMonthCostUsd: number;
  };
  llm: {
    totalCostUsd: number;
    thisMonthCostUsd: number;
    totalTokens: number;
    /** Which source the LLM numbers came from. */
    source: "langfuse" | "local" | "unavailable";
  };
  subscription: {
    tier: "core" | "pro" | null;
    status: string | null;
    currentPeriodEnd: string | null;
  };
}
