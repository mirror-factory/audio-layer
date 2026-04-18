/**
 * Langfuse API client — tests the null-safe paths and the daily-
 * metrics summarization. Does NOT hit the live Langfuse API.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  fetchLangfuseDailyMetrics,
  isLangfuseConfigured,
  startOfMonthIso,
  summarizeDailyMetrics,
} from "@/lib/observability/langfuse-api";

const originalFetch = globalThis.fetch;

describe("isLangfuseConfigured", () => {
  const origPk = process.env.LANGFUSE_PUBLIC_KEY;
  const origSk = process.env.LANGFUSE_SECRET_KEY;
  afterEach(() => {
    if (origPk === undefined) delete process.env.LANGFUSE_PUBLIC_KEY;
    else process.env.LANGFUSE_PUBLIC_KEY = origPk;
    if (origSk === undefined) delete process.env.LANGFUSE_SECRET_KEY;
    else process.env.LANGFUSE_SECRET_KEY = origSk;
  });

  it("is false when keys are missing", () => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    expect(isLangfuseConfigured()).toBe(false);
  });

  it("is true when both keys are set", () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test";
    expect(isLangfuseConfigured()).toBe(true);
  });
});

describe("fetchLangfuseDailyMetrics", () => {
  const origPk = process.env.LANGFUSE_PUBLIC_KEY;
  const origSk = process.env.LANGFUSE_SECRET_KEY;

  beforeEach(() => {
    globalThis.fetch = originalFetch;
  });
  afterEach(() => {
    globalThis.fetch = originalFetch;
    if (origPk === undefined) delete process.env.LANGFUSE_PUBLIC_KEY;
    else process.env.LANGFUSE_PUBLIC_KEY = origPk;
    if (origSk === undefined) delete process.env.LANGFUSE_SECRET_KEY;
    else process.env.LANGFUSE_SECRET_KEY = origSk;
  });

  it("returns null when keys aren't configured (no fetch)", async () => {
    delete process.env.LANGFUSE_PUBLIC_KEY;
    delete process.env.LANGFUSE_SECRET_KEY;
    let called = false;
    globalThis.fetch = (async () => {
      called = true;
      return new Response("{}", { status: 200 });
    }) as typeof fetch;
    const out = await fetchLangfuseDailyMetrics();
    expect(out).toBeNull();
    expect(called).toBe(false);
  });

  it("sends a Basic auth header and parses the response", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk-lf-test";
    process.env.LANGFUSE_SECRET_KEY = "sk-lf-test";
    let capturedUrl = "";
    let capturedAuth = "";
    globalThis.fetch = (async (input: RequestInfo, init?: RequestInit) => {
      capturedUrl = typeof input === "string" ? input : (input as Request).url;
      const headers = new Headers(init?.headers);
      capturedAuth = headers.get("authorization") ?? "";
      return new Response(
        JSON.stringify({
          data: [
            {
              date: "2026-04-17",
              countTraces: 5,
              countObservations: 10,
              totalCost: 0.42,
              usage: [
                {
                  model: "anthropic/claude-sonnet-4-6",
                  inputUsage: 12_000,
                  outputUsage: 3_000,
                  totalUsage: 15_000,
                  totalCost: 0.42,
                  countObservations: 10,
                  countTraces: 5,
                },
              ],
            },
          ],
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }) as typeof fetch;

    const out = await fetchLangfuseDailyMetrics({
      userId: "u-123",
      limit: 7,
    });
    expect(out).not.toBeNull();
    expect(out!.totalCostUsd).toBeCloseTo(0.42, 5);
    expect(out!.totalInputTokens).toBe(12_000);
    expect(out!.totalOutputTokens).toBe(3_000);
    expect(out!.totalTokens).toBe(15_000);
    expect(out!.traceCount).toBe(5);

    expect(capturedUrl).toContain("/api/public/metrics/daily");
    expect(capturedUrl).toContain("userId=u-123");
    expect(capturedUrl).toContain("limit=7");
    // Basic auth is base64("pk-lf-test:sk-lf-test")
    expect(capturedAuth.toLowerCase()).toMatch(/^basic /);
  });

  it("throws on non-2xx so the caller can fall back", async () => {
    process.env.LANGFUSE_PUBLIC_KEY = "pk";
    process.env.LANGFUSE_SECRET_KEY = "sk";
    globalThis.fetch = (async () =>
      new Response("nope", { status: 401, statusText: "Unauthorized" })) as typeof fetch;
    await expect(fetchLangfuseDailyMetrics()).rejects.toThrow(/401/);
  });
});

describe("summarizeDailyMetrics", () => {
  it("sums across days and models", () => {
    const out = summarizeDailyMetrics([
      {
        date: "2026-04-17",
        countTraces: 2,
        countObservations: 4,
        totalCost: 0.1,
        usage: [
          {
            model: "a",
            inputUsage: 1000,
            outputUsage: 200,
            totalUsage: 1200,
            totalCost: 0.1,
            countObservations: 4,
            countTraces: 2,
          },
        ],
      },
      {
        date: "2026-04-18",
        countTraces: 3,
        countObservations: 6,
        totalCost: 0.05,
        usage: [
          {
            model: "b",
            inputUsage: 500,
            outputUsage: 100,
            totalUsage: 600,
            totalCost: 0.05,
            countObservations: 6,
            countTraces: 3,
          },
        ],
      },
    ]);
    expect(out.traceCount).toBe(5);
    expect(out.totalInputTokens).toBe(1500);
    expect(out.totalOutputTokens).toBe(300);
    expect(out.totalTokens).toBe(1800);
    expect(out.totalCostUsd).toBeCloseTo(0.15, 5);
  });

  it("handles an empty array", () => {
    expect(summarizeDailyMetrics([]).totalCostUsd).toBe(0);
  });
});

describe("startOfMonthIso", () => {
  it("returns the first of the month in UTC", () => {
    const iso = startOfMonthIso(new Date("2026-04-17T12:34:56Z"));
    expect(iso).toBe("2026-04-01T00:00:00.000Z");
  });
});
