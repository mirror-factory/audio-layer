/**
 * Usage-aggregator test for the pure local-summarization path.
 *
 * The Supabase-facing getUsageSummary() needs a live DB + user
 * session; that's out of scope for unit tests. What we CAN verify in
 * isolation is the core aggregation math — the exported
 * __summarizeLocalMeetingsForTest function bundles a set of meeting
 * rows and returns totals. That's what the /usage page depends on.
 */

import { describe, it, expect } from "vitest";
import { __summarizeLocalMeetingsForTest } from "@/lib/billing/usage";
import type { MeetingCostBreakdown } from "@/lib/billing/types";

function fixtureCost(
  sttCost: number,
  llmCost: number,
  llmIn: number,
  llmOut: number,
): MeetingCostBreakdown {
  return {
    stt: {
      mode: "batch",
      model: "best",
      durationSeconds: 600,
      ratePerHour: 0.21,
      baseCostUsd: sttCost,
      addonCostUsd: 0,
      totalCostUsd: sttCost,
    },
    llm: {
      totalInputTokens: llmIn,
      totalOutputTokens: llmOut,
      totalCostUsd: llmCost,
      calls: [],
    },
    totalCostUsd: sttCost + llmCost,
  };
}

describe("__summarizeLocalMeetingsForTest", () => {
  it("returns zeros for no rows", () => {
    const out = __summarizeLocalMeetingsForTest([], new Date());
    expect(out).toEqual({
      meetings: 0,
      meetingsThisMonth: 0,
      minutes: 0,
      minutesThisMonth: 0,
      sttCost: 0,
      sttCostThisMonth: 0,
      llmCost: 0,
      llmCostThisMonth: 0,
      llmTokens: 0,
    });
  });

  it("counts meetings and minutes correctly", () => {
    const monthStart = new Date("2026-04-01T00:00:00Z");
    const out = __summarizeLocalMeetingsForTest(
      [
        {
          created_at: "2026-04-10T10:00:00Z",
          duration_seconds: 600,
          cost_breakdown: fixtureCost(0.05, 0.02, 500, 100),
        },
        {
          created_at: "2026-04-15T10:00:00Z",
          duration_seconds: 1800,
          cost_breakdown: fixtureCost(0.15, 0.04, 1000, 200),
        },
      ],
      monthStart,
    );
    expect(out.meetings).toBe(2);
    expect(out.meetingsThisMonth).toBe(2);
    expect(out.minutes).toBeCloseTo(40, 1); // 10 + 30
    expect(out.minutesThisMonth).toBeCloseTo(40, 1);
  });

  it("separates this-month from lifetime totals", () => {
    const monthStart = new Date("2026-04-01T00:00:00Z");
    const out = __summarizeLocalMeetingsForTest(
      [
        {
          created_at: "2026-03-29T10:00:00Z",
          duration_seconds: 600,
          cost_breakdown: fixtureCost(0.05, 0.02, 100, 50),
        },
        {
          created_at: "2026-04-10T10:00:00Z",
          duration_seconds: 600,
          cost_breakdown: fixtureCost(0.05, 0.02, 100, 50),
        },
      ],
      monthStart,
    );
    expect(out.meetings).toBe(2);
    expect(out.meetingsThisMonth).toBe(1);
    expect(out.sttCost).toBeCloseTo(0.1, 4);
    expect(out.sttCostThisMonth).toBeCloseTo(0.05, 4);
    expect(out.llmCost).toBeCloseTo(0.04, 4);
    expect(out.llmCostThisMonth).toBeCloseTo(0.02, 4);
  });

  it("handles meetings without cost_breakdown", () => {
    const out = __summarizeLocalMeetingsForTest(
      [
        {
          created_at: "2026-04-10T10:00:00Z",
          duration_seconds: 300,
          cost_breakdown: null,
        },
      ],
      new Date("2026-04-01T00:00:00Z"),
    );
    expect(out.meetings).toBe(1);
    expect(out.minutes).toBeCloseTo(5, 1);
    expect(out.sttCost).toBe(0);
    expect(out.llmCost).toBe(0);
  });

  it("sums LLM tokens across meetings", () => {
    const out = __summarizeLocalMeetingsForTest(
      [
        {
          created_at: "2026-04-10T10:00:00Z",
          duration_seconds: 100,
          cost_breakdown: fixtureCost(0, 0, 1000, 500),
        },
        {
          created_at: "2026-04-11T10:00:00Z",
          duration_seconds: 100,
          cost_breakdown: fixtureCost(0, 0, 2000, 300),
        },
      ],
      new Date("2026-04-01T00:00:00Z"),
    );
    expect(out.llmTokens).toBe(3800);
  });
});
