/**
 * Stripe client + tier-mapping tests.
 *
 * No live Stripe calls. Verifies that env-driven price-id mapping
 * is bidirectional and resilient to missing env vars.
 */

import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  getStripe,
  __resetStripeClient,
  priceIdForTier,
  tierForPriceId,
} from "@/lib/stripe/client";

describe("getStripe", () => {
  const original = process.env.STRIPE_SECRET_KEY;
  beforeEach(() => {
    __resetStripeClient();
  });
  afterEach(() => {
    if (original === undefined) delete process.env.STRIPE_SECRET_KEY;
    else process.env.STRIPE_SECRET_KEY = original;
    __resetStripeClient();
  });

  it("returns null when STRIPE_SECRET_KEY is unset", () => {
    delete process.env.STRIPE_SECRET_KEY;
    expect(getStripe()).toBeNull();
  });

  it("caches a single instance after construction", () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
    const a = getStripe();
    const b = getStripe();
    expect(a).not.toBeNull();
    expect(a).toBe(b);
  });
});

describe("priceIdForTier / tierForPriceId", () => {
  const originalCore = process.env.STRIPE_PRICE_CORE;
  const originalPro = process.env.STRIPE_PRICE_PRO;
  beforeEach(() => {
    process.env.STRIPE_PRICE_CORE = "price_core_test";
    process.env.STRIPE_PRICE_PRO = "price_pro_test";
  });
  afterEach(() => {
    if (originalCore === undefined) delete process.env.STRIPE_PRICE_CORE;
    else process.env.STRIPE_PRICE_CORE = originalCore;
    if (originalPro === undefined) delete process.env.STRIPE_PRICE_PRO;
    else process.env.STRIPE_PRICE_PRO = originalPro;
  });

  it("maps tier → price id from env", () => {
    expect(priceIdForTier("core")).toBe("price_core_test");
    expect(priceIdForTier("pro")).toBe("price_pro_test");
  });

  it("returns null for unset env tiers", () => {
    delete process.env.STRIPE_PRICE_CORE;
    expect(priceIdForTier("core")).toBeNull();
  });

  it("maps known price ids back to their tier", () => {
    expect(tierForPriceId("price_core_test")).toBe("core");
    expect(tierForPriceId("price_pro_test")).toBe("pro");
  });

  it("returns null for unknown price ids", () => {
    expect(tierForPriceId("price_other")).toBeNull();
  });
});
