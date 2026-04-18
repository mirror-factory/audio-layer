/**
 * AssemblyAI pricing helper tests.
 *
 * Verifies base-rate resolution per model×mode, add-on stacking,
 * multi-channel billing, and the two convenience wrappers that
 * match what our batch + streaming routes actually do.
 */

import { describe, it, expect } from "vitest";
import {
  estimateBatchMeetingCost,
  estimateStreamingMeetingCost,
  estimateTranscriptCost,
} from "@/lib/billing/assemblyai-pricing";

describe("estimateTranscriptCost — base rates", () => {
  it("charges $0.21/hr for batch best-tier", () => {
    // 1 hour exactly
    const out = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "best",
      mode: "batch",
    });
    expect(out.ratePerHour).toBe(0.21);
    expect(out.baseCostUsd).toBeCloseTo(0.21, 5);
    expect(out.addonCostUsd).toBe(0);
    expect(out.totalCostUsd).toBeCloseTo(0.21, 5);
  });

  it("charges $0.45/hr for streaming u3-rt-pro", () => {
    const out = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "u3-rt-pro",
      mode: "streaming",
    });
    expect(out.ratePerHour).toBe(0.45);
    expect(out.baseCostUsd).toBeCloseTo(0.45, 5);
  });

  it("scales linearly with duration", () => {
    const half = estimateTranscriptCost({
      durationSeconds: 1800,
      model: "best",
      mode: "batch",
    });
    expect(half.baseCostUsd).toBeCloseTo(0.105, 5);
  });

  it("falls back to a safe default for unknown models", () => {
    const out = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "made-up-model",
      mode: "batch",
    });
    // Falls back to $0.21 so we don't under-estimate.
    expect(out.ratePerHour).toBe(0.21);
  });

  it("stacks add-ons correctly on top of the base rate", () => {
    const out = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "best",
      mode: "batch",
      addons: ["speakerDiarization", "summarization"],
    });
    // 0.21 base + 0.02 (diarization) + 0.03 (summarization) per hour
    expect(out.baseCostUsd).toBeCloseTo(0.21, 5);
    expect(out.addonCostUsd).toBeCloseTo(0.05, 5);
    expect(out.totalCostUsd).toBeCloseTo(0.26, 5);
  });

  it("doubles cost for dual-channel audio", () => {
    const mono = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "best",
      mode: "batch",
    });
    const stereo = estimateTranscriptCost({
      durationSeconds: 3600,
      model: "best",
      mode: "batch",
      channels: 2,
    });
    expect(stereo.baseCostUsd).toBeCloseTo(mono.baseCostUsd * 2, 5);
    expect(stereo.billableSeconds).toBe(mono.billableSeconds * 2);
  });

  it("returns zero for zero-duration input", () => {
    const out = estimateTranscriptCost({
      durationSeconds: 0,
      model: "best",
      mode: "batch",
    });
    expect(out.totalCostUsd).toBe(0);
    expect(out.billableSeconds).toBe(0);
  });

  it("clamps negative durations to zero", () => {
    const out = estimateTranscriptCost({
      durationSeconds: -500,
      model: "best",
      mode: "batch",
    });
    expect(out.totalCostUsd).toBe(0);
  });
});

describe("estimateBatchMeetingCost", () => {
  it("includes speakerDiarization + entityDetection by default", () => {
    const out = estimateBatchMeetingCost(3600, "best");
    // 0.21 base + 0.02 (diarization) + 0.08 (entity) = 0.31/hr
    expect(out.totalCostUsd).toBeCloseTo(0.31, 5);
  });
});

describe("estimateStreamingMeetingCost", () => {
  it("charges streaming rate + diarization add-on", () => {
    const out = estimateStreamingMeetingCost(3600, "u3-rt-pro");
    // 0.45 base + 0.02 (diarization) = 0.47/hr
    expect(out.totalCostUsd).toBeCloseTo(0.47, 5);
  });
});
