import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  getCurrentUserId: vi.fn(),
  getOrCreateProfile: vi.fn(),
  setStripeCustomerId: vi.fn(),
  setSubscriptionState: vi.fn(),
}));

vi.mock("@/lib/supabase/user", () => ({
  getCurrentUserId: mocks.getCurrentUserId,
}));

vi.mock("@/lib/stripe/profiles", () => ({
  getOrCreateProfile: mocks.getOrCreateProfile,
  setStripeCustomerId: mocks.setStripeCustomerId,
  setSubscriptionState: mocks.setSubscriptionState,
}));

const STRIPE_ENV_KEYS = [
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "STRIPE_PRICE_CORE",
  "STRIPE_PRICE_PRO",
] as const;

let originalEnv: Record<(typeof STRIPE_ENV_KEYS)[number], string | undefined>;

function jsonRequest(path: string, body?: unknown): NextRequest {
  return new NextRequest(`http://localhost:3000${path}`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-request-id": "req_stripe_test" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

beforeEach(() => {
  originalEnv = Object.fromEntries(
    STRIPE_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof STRIPE_ENV_KEYS)[number], string | undefined>;
  vi.resetModules();
  for (const mock of Object.values(mocks)) {
    mock.mockReset();
  }
});

afterEach(() => {
  for (const key of STRIPE_ENV_KEYS) {
    const value = originalEnv[key];
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
});

describe("Stripe launch diagnostics", () => {
  it("checkout names STRIPE_SECRET_KEY when Stripe is not configured", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_1");
    delete process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_PRICE_CORE = "price_core_20";

    const { POST } = await import("@/app/api/stripe/checkout/route");
    const res = await POST(jsonRequest("/api/stripe/checkout", { tier: "core" }));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      code: "stripe_missing_secret_key",
      missingEnv: ["STRIPE_SECRET_KEY"],
    });
    expect(body.error).toContain("Stripe Checkout");
    expect(body.error).toContain("STRIPE_SECRET_KEY");
    expect(mocks.getOrCreateProfile).not.toHaveBeenCalled();
  });

  it("checkout names the missing price env and launch plan price", async () => {
    mocks.getCurrentUserId.mockResolvedValue("user_1");
    process.env.STRIPE_SECRET_KEY = "sk_test_layers_fake";
    delete process.env.STRIPE_PRICE_CORE;
    delete process.env.STRIPE_PRICE_PRO;

    const { POST } = await import("@/app/api/stripe/checkout/route");
    const coreRes = await POST(jsonRequest("/api/stripe/checkout", { tier: "core" }));
    const proRes = await POST(jsonRequest("/api/stripe/checkout", { tier: "pro" }));
    const coreBody = await coreRes.json();
    const proBody = await proRes.json();

    expect(coreRes.status).toBe(503);
    expect(coreBody).toMatchObject({
      code: "stripe_missing_price_id",
      missingEnv: ["STRIPE_PRICE_CORE"],
    });
    expect(coreBody.error).toContain("Core ($20/mo)");

    expect(proRes.status).toBe(503);
    expect(proBody).toMatchObject({
      code: "stripe_missing_price_id",
      missingEnv: ["STRIPE_PRICE_PRO"],
    });
    expect(proBody.error).toContain("Pro ($30/mo)");
    expect(mocks.getOrCreateProfile).not.toHaveBeenCalled();
  });

  it("webhook names STRIPE_WEBHOOK_SECRET before signature verification", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_layers_fake";
    delete process.env.STRIPE_WEBHOOK_SECRET;

    const { POST } = await import("@/app/api/stripe/webhook/route");
    const res = await POST(jsonRequest("/api/stripe/webhook", "{}"));
    const body = await res.json();

    expect(res.status).toBe(503);
    expect(body).toMatchObject({
      code: "stripe_missing_webhook_secret",
      missingEnv: ["STRIPE_WEBHOOK_SECRET"],
    });
    expect(body.error).toContain("STRIPE_WEBHOOK_SECRET");
    expect(mocks.setSubscriptionState).not.toHaveBeenCalled();
  });
});
