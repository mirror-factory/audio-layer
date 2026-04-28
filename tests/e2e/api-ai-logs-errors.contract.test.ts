import { test, expect } from "@playwright/test";

test("GET /api/ai-logs/errors returns a stable error list contract", async ({ request }) => {
  const response = await request.get("/api/ai-logs/errors?limit=5");

  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(Array.isArray(body)).toBe(true);

  for (const error of body) {
    expect(error).toEqual(
      expect.objectContaining({
        id: expect.any(String),
        timestamp: expect.any(String),
        source: expect.any(String),
        message: expect.any(String),
      }),
    );
  }
});
