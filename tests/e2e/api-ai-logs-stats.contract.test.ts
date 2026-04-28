import { test, expect } from "@playwright/test";

test("GET /api/ai-logs/stats returns local-first telemetry aggregates", async ({ request }) => {
  const response = await request.get("/api/ai-logs/stats");

  expect(response.status()).toBe(200);
  const body = await response.json();

  expect(body).toEqual(
    expect.objectContaining({
      totalCalls: expect.any(Number),
      totalCost: expect.any(Number),
      totalTokens: expect.any(Number),
      avgTTFT: expect.any(Number),
      p95TTFT: expect.any(Number),
      errorRate: expect.any(Number),
      abortRate: expect.any(Number),
      totalErrors: expect.any(Number),
      modelBreakdown: expect.any(Object),
      costByDay: expect.any(Object),
      callsByDay: expect.any(Object),
      errorsByDay: expect.any(Object),
      toolFrequency: expect.any(Object),
      sessions: expect.any(Array),
      backend: expect.any(String),
    }),
  );
});
