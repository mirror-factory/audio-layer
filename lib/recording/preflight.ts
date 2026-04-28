import type { QuotaResult } from "@/lib/billing/quota";
import type { PricingConfigVersion } from "@/lib/billing/pricing-config";
import {
  STT_PRICING_OPTIONS,
  formatMoney,
  sttCostPerMinute,
  type SttPricingOption,
} from "@/lib/billing/stt-pricing";
import type { ModelSettings } from "@/lib/settings-shared";

export type RecordingPreflightCheckId =
  | "quota"
  | "provider"
  | "pricing"
  | "model";

export type RecordingPreflightCheckStatus =
  | "ready"
  | "blocked"
  | "warning"
  | "unknown";

export interface RecordingPreflightCheck {
  id: RecordingPreflightCheckId;
  label: string;
  status: RecordingPreflightCheckStatus;
  detail: string;
}

export interface RecordingPreflightResponse {
  status: "ready" | "blocked" | "degraded";
  checkedAt: string;
  checks: RecordingPreflightCheck[];
  provider: {
    id: string;
    label: string;
    model: string;
    runtimeStatus: string;
    effectiveRatePerHourUsd: number;
    costPerThirtyMinutesUsd: number;
    sourceUrl: string;
  };
  quota: {
    planId: string;
    bypassed: boolean;
    meetingLimit: number | null;
    minuteLimit: number | null;
    monthlyMinutesUsed: number;
  };
}

function resolveStreamingOption(
  pricing: PricingConfigVersion,
  settings: ModelSettings,
): SttPricingOption {
  return (
    STT_PRICING_OPTIONS.find((option) => option.id === pricing.sttOptionId) ??
    STT_PRICING_OPTIONS.find(
      (option) =>
        option.provider === "assemblyai" &&
        option.mode === "streaming" &&
        option.model === settings.streamingSpeechModel,
    ) ??
    STT_PRICING_OPTIONS[0]
  );
}

function quotaDetail(quota: QuotaResult): string {
  if (quota.bypassed) return "Local unlimited mode";
  if (!quota.allowed && quota.reason === "minute_limit") {
    return `${quota.monthlyMinutesUsed}/${quota.minuteLimit} monthly minutes used`;
  }
  if (!quota.allowed && quota.reason === "meeting_limit") {
    const used =
      quota.meetingLimitPeriod === "lifetime"
        ? quota.meetingCount
        : quota.monthlyMeetingCount;
    return `${used}/${quota.meetingLimit} meetings used`;
  }
  if (quota.minuteLimit !== null) {
    return `${quota.monthlyMinutesUsed}/${quota.minuteLimit} monthly minutes used`;
  }
  return `${quota.planId} plan ready`;
}

export function buildRecordingPreflight(opts: {
  quota: QuotaResult;
  providerConfigured: boolean;
  pricing: PricingConfigVersion;
  settings: ModelSettings;
  checkedAt?: string;
}): RecordingPreflightResponse {
  const selectedOption = resolveStreamingOption(opts.pricing, opts.settings);
  const effectiveRatePerHourUsd = sttCostPerMinute(
    selectedOption,
    opts.pricing.addonIds,
  ) * 60;
  const checks: RecordingPreflightCheck[] = [
    {
      id: "quota",
      label: "Quota",
      status: opts.quota.allowed ? "ready" : "blocked",
      detail: quotaDetail(opts.quota),
    },
    {
      id: "provider",
      label: "STT provider",
      status: opts.providerConfigured ? "ready" : "blocked",
      detail: opts.providerConfigured
        ? `${selectedOption.providerLabel} is configured`
        : `${selectedOption.providerLabel} API key is missing`,
    },
    {
      id: "pricing",
      label: "Cost source",
      status: "ready",
      detail: `${formatMoney(effectiveRatePerHourUsd)}/hr from ${opts.pricing.name}`,
    },
    {
      id: "model",
      label: "Runtime model",
      status:
        selectedOption.runtimeStatus === "implemented" ? "ready" : "warning",
      detail: `${selectedOption.label} · ${selectedOption.runtimeStatus ?? "unlabeled"}`,
    },
  ];
  const blocked = checks.some((check) => check.status === "blocked");
  const degraded = checks.some((check) => check.status === "warning");

  return {
    status: blocked ? "blocked" : degraded ? "degraded" : "ready",
    checkedAt: opts.checkedAt ?? new Date().toISOString(),
    checks,
    provider: {
      id: selectedOption.id,
      label: selectedOption.providerLabel,
      model: selectedOption.model,
      runtimeStatus: selectedOption.runtimeStatus ?? "unlabeled",
      effectiveRatePerHourUsd,
      costPerThirtyMinutesUsd: effectiveRatePerHourUsd / 2,
      sourceUrl: selectedOption.sourceUrl,
    },
    quota: {
      planId: opts.quota.planId,
      bypassed: opts.quota.bypassed ?? false,
      meetingLimit: opts.quota.meetingLimit,
      minuteLimit: opts.quota.minuteLimit,
      monthlyMinutesUsed: opts.quota.monthlyMinutesUsed,
    },
  };
}
