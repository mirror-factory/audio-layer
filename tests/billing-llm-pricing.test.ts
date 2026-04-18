/**
 * LLM pricing helper tests.
 *
 * Pure functions. Verifies the pricing table lookup (exact +
 * partial match + default fallback), cached-token discount,
 * and the formatUsd buckets for small-, regular-, and large-cost
 * values.
 */

import { describe, it, expect } from "vitest";
import {
  COST_PER_M_TOKENS,
  estimateLlmCost,
  formatUsd,
  pricingForModel,
  stripModelPrefix,
} from "@/lib/billing/llm-pricing";

describe("stripModelPrefix", () => {
  it("drops everything before the last slash", () => {
    expect(stripModelPrefix("anthropic/claude-sonnet-4-6")).toBe(
      "claude-sonnet-4-6",
    );
    expect(stripModelPrefix("google/gemini-3-flash")).toBe(
      "gemini-3-flash",
    );
  });
  it("returns the original string when no slash", () => {
    expect(stripModelPrefix("claude-sonnet-4-6")).toBe("claude-sonnet-4-6");
  });
  it("handles empty input without crashing", () => {
    expect(stripModelPrefix("")).toBe("");
  });
});

describe("pricingForModel", () => {
  it("matches full provider-prefixed model id", () => {
    expect(pricingForModel("anthropic/claude-sonnet-4-6")).toEqual(
      COST_PER_M_TOKENS["claude-sonnet-4-6"],
    );
  });
  it("matches bare model id", () => {
    expect(pricingForModel("gpt-4.1-mini")).toEqual(
      COST_PER_M_TOKENS["gpt-4.1-mini"],
    );
  });
  it("falls back to a partial match on variants", () => {
    // "gemini-3-flash-preview" exists in the table, "gemini-3-flash"
    // also. Check that the prefix match resolves to *something* valid.
    const p = pricingForModel("google/gemini-3-flash-experimental");
    expect(p.input).toBeGreaterThan(0);
    expect(p.output).toBeGreaterThan(0);
  });
  it("falls back to the default for unknown models", () => {
    const p = pricingForModel("made-up-model-9000");
    expect(p.input).toBe(1);
    expect(p.output).toBe(3);
  });
});

describe("estimateLlmCost", () => {
  it("computes fresh-input + output cost", () => {
    // Claude Sonnet 4.6: $3/M input, $15/M output
    const cost = estimateLlmCost("anthropic/claude-sonnet-4-6", {
      inputTokens: 10_000,
      outputTokens: 2_000,
    });
    // 10k × 3/M = $0.03; 2k × 15/M = $0.03. Total = $0.06
    expect(cost).toBeCloseTo(0.06, 4);
  });

  it("applies the cached-input discount when provided", () => {
    // Claude Sonnet: input $3, cachedInput $0.3. 10k cached + 0 fresh.
    const cost = estimateLlmCost("anthropic/claude-sonnet-4-6", {
      inputTokens: 10_000,
      cachedInputTokens: 10_000,
      outputTokens: 0,
    });
    // 10k × 0.3/M = $0.003
    expect(cost).toBeCloseTo(0.003, 4);
  });

  it("returns 0 for empty usage", () => {
    const cost = estimateLlmCost("anthropic/claude-sonnet-4-6", {
      inputTokens: 0,
      outputTokens: 0,
    });
    expect(cost).toBe(0);
  });
});

describe("formatUsd", () => {
  it("returns $0.000 for 0 or negative", () => {
    expect(formatUsd(0)).toBe("$0.000");
    expect(formatUsd(-1)).toBe("$0.000");
  });
  it("renders sub-penny as milli-dollars", () => {
    expect(formatUsd(0.0005)).toBe("$0.500m");
  });
  it("renders mid-cents with 4 decimals", () => {
    expect(formatUsd(0.0023)).toBe("$0.0023");
  });
  it("renders typical dollar amounts with 3 decimals", () => {
    expect(formatUsd(1.234)).toBe("$1.234");
  });
  it("renders large amounts with 2 decimals", () => {
    expect(formatUsd(1234.5)).toBe("$1234.50");
  });
});
