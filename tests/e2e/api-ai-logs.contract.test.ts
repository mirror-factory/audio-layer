import { test, expect } from "@playwright/test";

test("GET /api/ai-logs returns a stable log list contract", async ({ request }) => {
  const response = await request.get("/api/ai-logs?limit=5");

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);

  for (const log of body) {
    expect(log).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(String),
        modelId: expect.any(String),
        totalTokens: expect.any(Number),
        cost: expect.any(Number),
      }),
    );
  }
});
