import { describe, it, expect } from "vitest";
import {
  estimateBatchMeetingCost,
  estimateStreamingMeetingCost,
  estimateTranscriptCost,
  BASE_RATES_PER_HOUR,
  ADDON_PER_HOUR,
} from "@/lib/billing/assemblyai-pricing";

describe("estimateBatchMeetingCost", () => {
  it("returns correct breakdown for a 1-hour meeting", () => {
    const result = estimateBatchMeetingCost(3600, "universal-3-pro");

    expect(result.mode).toBe("batch");
    expect(result.model).toBe("universal-3-pro");
    expect(result.durationSeconds).toBe(3600);
    expect(result.ratePerHour).toBe(0.21);
    expect(result.baseCostUsd).toBeCloseTo(0.21, 6);
    // addons: speakerDiarization ($0.02) + entityDetection ($0.08) = $0.10/hr
    expect(result.addonCostUsd).toBeCloseTo(0.10, 6);
    expect(result.totalCostUsd).toBeCloseTo(0.31, 6);
  });

  it("returns correct breakdown for a 30-minute meeting", () => {
    const result = estimateBatchMeetingCost(1800);

    expect(result.durationSeconds).toBe(1800);
    expect(result.baseCostUsd).toBeCloseTo(0.105, 6);
    expect(result.addonCostUsd).toBeCloseTo(0.05, 6);
    expect(result.totalCostUsd).toBeCloseTo(0.155, 6);
  });

  it("uses default model when none specified", () => {
    const result = estimateBatchMeetingCost(3600);
    expect(result.model).toBe("universal-3-pro");
  });
});

describe("estimateStreamingMeetingCost", () => {
  it("returns correct breakdown for a 1-hour meeting", () => {
    const result = estimateStreamingMeetingCost(3600, "u3-rt-pro");

    expect(result.mode).toBe("streaming");
    expect(result.model).toBe("u3-rt-pro");
    expect(result.durationSeconds).toBe(3600);
    expect(result.ratePerHour).toBe(0.45);
    expect(result.baseCostUsd).toBeCloseTo(0.45, 6);
    // No add-ons in streaming mode
    expect(result.addonCostUsd).toBe(0);
    expect(result.totalCostUsd).toBeCloseTo(0.45, 6);
  });

  it("uses default model when none specified", () => {
    const result = estimateStreamingMeetingCost(3600);
    expect(result.model).toBe("u3-rt-pro");
  });
});

describe("zero duration", () => {
  it("returns zero cost for batch with 0 seconds", () => {
    const result = estimateBatchMeetingCost(0);
    expect(result.baseCostUsd).toBe(0);
    expect(result.addonCostUsd).toBe(0);
    expect(result.totalCostUsd).toBe(0);
  });

  it("returns zero cost for streaming with 0 seconds", () => {
    const result = estimateStreamingMeetingCost(0);
    expect(result.baseCostUsd).toBe(0);
    expect(result.addonCostUsd).toBe(0);
    expect(result.totalCostUsd).toBe(0);
  });
});

describe("estimateTranscriptCost", () => {
  it("uses fallback rate for unknown model", () => {
    const result = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "unknown-model",
      mode: "batch",
    });
    // Fallback rate is 0.21
    expect(result.ratePerHour).toBe(0.21);
    expect(result.baseCostUsd).toBeCloseTo(0.21, 6);
  });

  it("computes addon costs correctly", () => {
    const result = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "universal-3-pro",
      mode: "batch",
      addons: ["summarization", "sentiment"],
    });
    // addons: summarization ($0.03) + sentiment ($0.02) = $0.05/hr
    expect(result.addonCostUsd).toBeCloseTo(0.05, 6);
  });

  it("ignores unknown addons", () => {
    const result = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "universal-3-pro",
      mode: "batch",
      addons: ["nonexistentAddon"],
    });
    expect(result.addonCostUsd).toBe(0);
  });
});
