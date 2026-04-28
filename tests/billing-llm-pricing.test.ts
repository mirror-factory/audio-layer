import { describe, it, expect } from "vitest";
import {
  stripModelPrefix,
  pricingForModel,
  estimateLlmCost,
  formatUsd,
  LLM_PRICING_OPTIONS,
  LLM_PRICING_VALIDATED_ON,
} from "@/lib/billing/llm-pricing";

describe("stripModelPrefix", () => {
  it("removes provider prefix from model ID", () => {
    expect(stripModelPrefix("anthropic/claude-sonnet-4-6")).toBe(
      "claude-sonnet-4-6",
    );
    expect(stripModelPrefix("openai/gpt-4.1")).toBe("gpt-4.1");
    expect(stripModelPrefix("google/gemini-2.5-pro")).toBe("gemini-2.5-pro");
  });

  it("returns the model ID unchanged when no prefix", () => {
    expect(stripModelPrefix("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
    expect(stripModelPrefix("gpt-4.1")).toBe("gpt-4.1");
  });

  it("handles multiple slashes by stripping only the first segment", () => {
    expect(stripModelPrefix("a/b/c")).toBe("b/c");
  });
});

describe("pricingForModel", () => {
  it("keeps every pricing option sourced and validated", () => {
    expect(LLM_PRICING_VALIDATED_ON).toBe("2026-04-26");

    for (const option of LLM_PRICING_OPTIONS) {
      expect(option.sourceUrl).toMatch(/^https:\/\//);
      expect(option.validatedOn).toBe(LLM_PRICING_VALIDATED_ON);
      expect(option.pricing.input).toBeGreaterThanOrEqual(0);
      expect(option.pricing.output).toBeGreaterThanOrEqual(0);
    }
  });

  it("finds exact match for known model", () => {
    const pricing = pricingForModel("claude-sonnet-4-6");
    expect(pricing).toEqual({ input: 3.0, output: 15.0, cachedInput: 0.3 });
  });

  it("finds match when model has provider prefix", () => {
    const pricing = pricingForModel("anthropic/claude-sonnet-4-6");
    expect(pricing).toEqual({ input: 3.0, output: 15.0, cachedInput: 0.3 });
  });

  it("returns null for unknown model", () => {
    expect(pricingForModel("unknown-model-xyz")).toBeNull();
  });

  it("returns pricing without cachedInput for models that lack it", () => {
    const pricing = pricingForModel("gpt-4.1");
    expect(pricing).not.toBeNull();
    expect(pricing!.cachedInput).toBeUndefined();
  });

  it("uses current Gemini 2.5 Flash standard pricing", () => {
    expect(pricingForModel("google/gemini-2.5-flash")).toEqual({
      input: 0.3,
      output: 2.5,
      cachedInput: 0.03,
    });
  });
});

describe("estimateLlmCost", () => {
  it("computes cost correctly for normal tokens", () => {
    // claude-sonnet-4-6: input $3/M, output $15/M
    const cost = estimateLlmCost("claude-sonnet-4-6", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBeCloseTo(3.0 + 15.0, 6);
  });

  it("computes cost correctly with cached tokens", () => {
    // claude-sonnet-4-6: input $3/M, output $15/M, cachedInput $0.3/M
    const cost = estimateLlmCost("claude-sonnet-4-6", {
      inputTokens: 1_000_000,
      outputTokens: 500_000,
      cachedInputTokens: 400_000,
    });
    // nonCached = 600_000; cached = 400_000
    // cost = (600_000 * 3) / 1M + (500_000 * 15) / 1M + (400_000 * 0.3) / 1M
    //      = 1.8 + 7.5 + 0.12 = 9.42
    expect(cost).toBeCloseTo(9.42, 6);
  });

  it("bills cached tokens at 10% input rate when no cachedInput price", () => {
    // gpt-4.1: input $2/M, output $8/M, no cachedInput
    const cost = estimateLlmCost("gpt-4.1", {
      inputTokens: 1_000_000,
      outputTokens: 0,
      cachedInputTokens: 500_000,
    });
    // nonCached = 500_000; cached = 500_000
    // cost = (500_000 * 2) / 1M + (500_000 * 2 * 0.1) / 1M
    //      = 1.0 + 0.1 = 1.1
    expect(cost).toBeCloseTo(1.1, 6);
  });

  it("returns 0 for unknown model", () => {
    const cost = estimateLlmCost("nonexistent-model", {
      inputTokens: 1_000_000,
      outputTokens: 1_000_000,
    });
    expect(cost).toBe(0);
  });

  it("handles zero tokens", () => {
    const cost = estimateLlmCost("claude-sonnet-4-6", {
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(cost).toBe(0);
  });
});

describe("formatUsd", () => {
  it("formats amounts >= $0.01 with 2 decimal places", () => {
    expect(formatUsd(1.5)).toBe("$1.50");
    expect(formatUsd(0.01)).toBe("$0.01");
    expect(formatUsd(123.456)).toBe("$123.46");
  });

  it("formats amounts < $0.01 with 4 decimal places", () => {
    expect(formatUsd(0.001)).toBe("$0.0010");
    expect(formatUsd(0.0099)).toBe("$0.0099");
    expect(formatUsd(0.00001)).toBe("$0.0000");
  });

  it("formats zero", () => {
    expect(formatUsd(0)).toBe("$0.0000");
  });
});
