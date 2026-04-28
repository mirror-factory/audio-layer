import { describe, expect, it } from "vitest";
import {
  DEFAULT_PRICING_ASSUMPTIONS,
  DEFAULT_PRICING_PLANS,
  DEFAULT_CUSTOMER_MIX,
  STT_PRICING_OPTIONS,
  STT_PRICING_VALIDATED_ON,
  estimatePortfolioEconomics,
  estimatePlanEconomics,
  estimateSttCost,
  sttCostPerMinute,
} from "@/lib/billing/stt-pricing";

describe("STT pricing catalog", () => {
  it("prices AssemblyAI Universal Streaming with diarization", () => {
    const result = estimateSttCost({
      optionId: "assemblyai:universal-streaming-multilingual:streaming",
      durationMinutes: 60,
      addonIds: ["streamingSpeakerDiarization"],
    });

    expect(result.baseCostUsd).toBeCloseTo(0.15, 6);
    expect(result.addonCostUsd).toBeCloseTo(0.12, 6);
    expect(result.totalCostUsd).toBeCloseTo(0.27, 6);
    expect(result.effectiveRatePerHourUsd).toBeCloseTo(0.27, 6);
  });

  it("normalizes Deepgram Nova-3 pay-as-you-go to per-minute math", () => {
    const result = estimateSttCost({
      optionId: "deepgram:nova-3:streaming",
      durationMinutes: 100,
      addonIds: ["speakerDiarization"],
    });

    expect(sttCostPerMinute(result.option, ["speakerDiarization"])).toBeCloseTo(0.0097, 6);
    expect(result.totalCostUsd).toBeCloseTo(0.97, 6);
  });

  it("keeps every provider option sourced and validated", () => {
    expect(STT_PRICING_VALIDATED_ON).toBe("2026-04-26");
    expect(STT_PRICING_OPTIONS.length).toBeGreaterThanOrEqual(18);

    for (const option of STT_PRICING_OPTIONS) {
      expect(option.sourceUrl).toMatch(/^https:\/\//);
      expect(option.validatedOn).toBe(STT_PRICING_VALIDATED_ON);
      expect(option.ratePerHourUsd).toBeGreaterThan(0);
      expect(option.runtimeStatus).toBeTruthy();
    }
  });

  it("normalizes token-equivalent Soniox realtime pricing", () => {
    const result = estimateSttCost({
      optionId: "soniox:realtime:streaming",
      durationMinutes: 1000,
    });

    expect(result.effectiveRatePerHourUsd).toBeCloseTo(0.12, 6);
    expect(result.totalCostUsd).toBeCloseTo(2, 6);
  });

  it("computes target margin economics for Core", () => {
    const core = DEFAULT_PRICING_PLANS.find((plan) => plan.id === "core");
    expect(core).toBeDefined();

    const economics = estimatePlanEconomics({
      plan: core!,
      sttOptionId: "assemblyai:universal-streaming-multilingual:streaming",
      addonIds: [],
      assumptions: DEFAULT_PRICING_ASSUMPTIONS,
    });

    expect(economics.sttCostUsd).toBeCloseTo(1.5, 6);
    expect(economics.llmCostUsd).toBeCloseTo(0.08, 6);
    expect(economics.grossMarginPercent).toBeCloseTo(76.23, 2);
    expect(economics.targetPriceUsd).toBeLessThan(economics.plan.monthlyPriceUsd);
    expect(economics.breakEvenMinutes).toBeGreaterThan(4000);
  });

  it("models a 1,000-customer portfolio scenario", () => {
    const economics = estimatePortfolioEconomics({
      plans: DEFAULT_PRICING_PLANS,
      customerMix: DEFAULT_CUSTOMER_MIX,
      sttOptionId: "assemblyai:universal-streaming-multilingual:streaming",
      addonIds: [],
      assumptions: DEFAULT_PRICING_ASSUMPTIONS,
    });

    expect(economics.totalCustomers).toBe(1000);
    expect(economics.payingCustomers).toBe(750);
    expect(economics.mrrUsd).toBe(12250);
    expect(economics.arrUsd).toBe(147000);
    expect(economics.monthlyProfitUsd).toBeGreaterThan(7000);
    expect(economics.grossMarginPercent).toBeGreaterThan(60);
  });
});
