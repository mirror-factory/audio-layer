import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";

describe("getStripe", () => {
  let originalKey: string | undefined;

  beforeEach(() => {
    originalKey = process.env.STRIPE_SECRET_KEY;
    // Reset the cached module between tests so the singleton resets
    vi.resetModules();
  });

  afterEach(() => {
    if (originalKey === undefined) {
      delete process.env.STRIPE_SECRET_KEY;
    } else {
      process.env.STRIPE_SECRET_KEY = originalKey;
    }
  });

  it("returns null without STRIPE_SECRET_KEY", async () => {
    delete process.env.STRIPE_SECRET_KEY;
    const { getStripe } = await import("@/lib/stripe/client");
    expect(getStripe()).toBeNull();
  });
});

describe("priceIdForTier", () => {
  let originalCore: string | undefined;
  let originalPro: string | undefined;

  beforeEach(() => {
    originalCore = process.env.STRIPE_PRICE_CORE;
    originalPro = process.env.STRIPE_PRICE_PRO;
  });

  afterEach(() => {
    if (originalCore === undefined) {
      delete process.env.STRIPE_PRICE_CORE;
    } else {
      process.env.STRIPE_PRICE_CORE = originalCore;
    }
    if (originalPro === undefined) {
      delete process.env.STRIPE_PRICE_PRO;
    } else {
      process.env.STRIPE_PRICE_PRO = originalPro;
    }
  });

  it("reads core price from env", async () => {
    process.env.STRIPE_PRICE_CORE = "price_core_123";
    const { priceIdForTier } = await import("@/lib/stripe/client");
    expect(priceIdForTier("core")).toBe("price_core_123");
  });

  it("reads pro price from env", async () => {
    process.env.STRIPE_PRICE_PRO = "price_pro_456";
    const { priceIdForTier } = await import("@/lib/stripe/client");
    expect(priceIdForTier("pro")).toBe("price_pro_456");
  });

  it("returns null when env var is not set", async () => {
    delete process.env.STRIPE_PRICE_CORE;
    const { priceIdForTier } = await import("@/lib/stripe/client");
    expect(priceIdForTier("core")).toBeNull();
  });
});

describe("tierForPriceId", () => {
  let originalCore: string | undefined;
  let originalPro: string | undefined;

  beforeEach(() => {
    originalCore = process.env.STRIPE_PRICE_CORE;
    originalPro = process.env.STRIPE_PRICE_PRO;
  });

  afterEach(() => {
    if (originalCore === undefined) {
      delete process.env.STRIPE_PRICE_CORE;
    } else {
      process.env.STRIPE_PRICE_CORE = originalCore;
    }
    if (originalPro === undefined) {
      delete process.env.STRIPE_PRICE_PRO;
    } else {
      process.env.STRIPE_PRICE_PRO = originalPro;
    }
  });

  it("maps core price ID back to core tier", async () => {
    process.env.STRIPE_PRICE_CORE = "price_core_abc";
    const { tierForPriceId } = await import("@/lib/stripe/client");
    expect(tierForPriceId("price_core_abc")).toBe("core");
  });

  it("maps pro price ID back to pro tier", async () => {
    process.env.STRIPE_PRICE_PRO = "price_pro_xyz";
    const { tierForPriceId } = await import("@/lib/stripe/client");
    expect(tierForPriceId("price_pro_xyz")).toBe("pro");
  });

  it("returns null for unknown price ID", async () => {
    process.env.STRIPE_PRICE_CORE = "price_core_abc";
    process.env.STRIPE_PRICE_PRO = "price_pro_xyz";
    const { tierForPriceId } = await import("@/lib/stripe/client");
    expect(tierForPriceId("price_unknown")).toBeNull();
  });
});
