import { test, expect } from "@playwright/test";

test("GET /api/control-plane returns the starter control plane contract", async ({ request }) => {
  const response = await request.get("/api/control-plane");

  expect(response.status()).toBe(200);
  const body = await response.json();

  expect(body).toEqual(
    expect.objectContaining({
      ok: true,
      generatedAt: expect.any(String),
      data: expect.objectContaining({
        generatedAt: expect.any(String),
        manifest: expect.objectContaining({
          version: expect.any(String),
          enabledModules: expect.any(Array),
          commands: expect.any(Array),
        }),
        counts: expect.objectContaining({
          docs: expect.any(Number),
          hooks: expect.any(Number),
          evidence: expect.any(Number),
          features: expect.any(Number),
          companions: expect.any(Number),
        }),
        coverage: expect.any(Object),
        browserProof: expect.objectContaining({
          required: expect.any(Boolean),
          replayPaths: expect.any(Array),
          flowPaths: expect.any(Array),
          screenshotPaths: expect.any(Array),
        }),
        actions: expect.objectContaining({
          available: expect.any(Array),
          recentRuns: expect.any(Array),
        }),
        evidenceExport: expect.objectContaining({
          downloadPath: expect.any(String),
          included: expect.any(Array),
          warnings: expect.any(Array),
        }),
      }),
    }),
  );
});

test("POST /api/control-plane rejects unknown actions safely", async ({ request }) => {
  const response = await request.post("/api/control-plane", {
    data: { actionId: "rm-rf-not-allowed" },
  });

  expect(response.status()).toBe(404);
  const body = await response.json();
  expect(body).toEqual(
    expect.objectContaining({
      ok: false,
      result: expect.objectContaining({
        actionId: "rm-rf-not-allowed",
        status: "missing",
        error: expect.stringContaining("Unknown control-plane action"),
      }),
    }),
  );
});

test("GET /api/control-plane/evidence-export returns a stable empty state before export", async ({ request }) => {
  const response = await request.get("/api/control-plane/evidence-export");

  expect([200, 404]).toContain(response.status());
  if (response.status() === 404) {
    const body = await response.json();
    expect(body).toEqual(
      expect.objectContaining({
        ok: false,
        error: expect.stringContaining("No evidence export exists"),
      }),
    );
  } else {
    expect(response.headers()["content-type"]).toContain("application/gzip");
  }
});
