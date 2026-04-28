import { describe, expect, it } from "vitest";
import { buildRecordingPreflight } from "@/lib/recording/preflight";
import {
  DEFAULT_PRICING_ASSUMPTIONS,
  DEFAULT_PRICING_PLANS,
  type PricingPlanInput,
} from "@/lib/billing/stt-pricing";
import type { QuotaResult } from "@/lib/billing/quota";
import type { PricingConfigVersion } from "@/lib/billing/pricing-config";

function quota(overrides: Partial<QuotaResult> = {}): QuotaResult {
  return {
    allowed: true,
    meetingCount: 0,
    monthlyMeetingCount: 0,
    monthlyMinutesUsed: 0,
    limit: 25,
    meetingLimit: 25,
    meetingLimitPeriod: "lifetime",
    minuteLimit: 120,
    planId: "free",
    isSubscriber: false,
    ...overrides,
  };
}

function pricing(overrides: Partial<PricingConfigVersion> = {}): PricingConfigVersion {
  const now = "2026-04-26T00:00:00.000Z";
  return {
    id: "active",
    name: "Active config",
    status: "active",
    startsAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
    sttOptionId: "assemblyai:universal-streaming-multilingual:streaming",
    addonIds: [],
    assumptions: DEFAULT_PRICING_ASSUMPTIONS,
    plans: DEFAULT_PRICING_PLANS as PricingPlanInput[],
    customerMix: [],
    ...overrides,
  };
}

describe("buildRecordingPreflight", () => {
  it("marks the recording path ready when quota and provider are available", () => {
    const preflight = buildRecordingPreflight({
      quota: quota(),
      providerConfigured: true,
      pricing: pricing(),
      settings: {
        summaryModel: "openai/gpt-5.4-nano",
        batchSpeechModel: "universal-2",
        streamingSpeechModel: "universal-streaming-multilingual",
      },
      checkedAt: "2026-04-26T00:00:00.000Z",
    });

    expect(preflight.status).toBe("ready");
    expect(preflight.provider.effectiveRatePerHourUsd).toBeCloseTo(0.15);
    expect(preflight.checks.map((check) => check.id)).toEqual([
      "quota",
      "provider",
      "pricing",
      "model",
    ]);
  });

  it("blocks recording when provider credentials are missing", () => {
    const preflight = buildRecordingPreflight({
      quota: quota(),
      providerConfigured: false,
      pricing: pricing(),
      settings: {
        summaryModel: "openai/gpt-5.4-nano",
        batchSpeechModel: "universal-2",
        streamingSpeechModel: "universal-streaming-multilingual",
      },
    });

    expect(preflight.status).toBe("blocked");
    expect(preflight.checks.find((check) => check.id === "provider")).toMatchObject({
      status: "blocked",
    });
  });

  it("surfaces quota blocks before the paid token path", () => {
    const preflight = buildRecordingPreflight({
      quota: quota({
        allowed: false,
        reason: "minute_limit",
        monthlyMinutesUsed: 120,
      }),
      providerConfigured: true,
      pricing: pricing(),
      settings: {
        summaryModel: "openai/gpt-5.4-nano",
        batchSpeechModel: "universal-2",
        streamingSpeechModel: "universal-streaming-multilingual",
      },
    });

    expect(preflight.status).toBe("blocked");
    expect(preflight.checks.find((check) => check.id === "quota")?.detail).toContain(
      "120/120",
    );
  });
});
