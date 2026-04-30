import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_PRICING_ASSUMPTIONS, DEFAULT_PRICING_PLANS } from "@/lib/billing/stt-pricing";

const mocks = vi.hoisted(() => ({
  getSupabaseUser: vi.fn(),
  getActivePricingConfig: vi.fn(),
}));

vi.mock("@/lib/supabase/user", () => ({
  getSupabaseUser: mocks.getSupabaseUser,
}));

vi.mock("@/lib/billing/pricing-config", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/billing/pricing-config")>();
  return {
    ...actual,
    getActivePricingConfig: mocks.getActivePricingConfig,
  };
});

const { checkQuota, quotaBypassEnabled } = await import("@/lib/billing/quota");

function pricingConfig() {
  const now = new Date().toISOString();
  return {
    id: "active",
    name: "Active",
    status: "active" as const,
    startsAt: now,
    activatedAt: now,
    createdAt: now,
    updatedAt: now,
    sttOptionId: "assemblyai:universal-streaming-multilingual:streaming",
    addonIds: [],
    assumptions: DEFAULT_PRICING_ASSUMPTIONS,
    plans: DEFAULT_PRICING_PLANS,
    customerMix: [],
  };
}

function supabaseMock({
  profile,
  meetings,
}: {
  profile: Record<string, unknown> | null;
  meetings: Array<Record<string, unknown>>;
}) {
  return {
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: "user_a" } } }),
    },
    from: vi.fn((table: string) => {
      if (table === "profiles") {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: profile }),
        };
      }
      return {
        select: vi.fn().mockResolvedValue({ data: meetings, error: null }),
      };
    }),
  };
}

describe("checkQuota", () => {
  let originalBypass: string | undefined;
  let originalLegacyBypass: string | undefined;
  let originalProductionBypass: string | undefined;
  let originalLegacyProductionBypass: string | undefined;

  beforeEach(() => {
    originalBypass = process.env.LAYERS_BYPASS_QUOTA;
    originalLegacyBypass = process.env.LAYER_ONE_BYPASS_QUOTA;
    originalProductionBypass = process.env.LAYERS_ALLOW_PROD_QUOTA_BYPASS;
    originalLegacyProductionBypass =
      process.env.LAYER_ONE_ALLOW_PROD_QUOTA_BYPASS;
    delete process.env.LAYERS_BYPASS_QUOTA;
    delete process.env.LAYER_ONE_BYPASS_QUOTA;
    delete process.env.LAYERS_ALLOW_PROD_QUOTA_BYPASS;
    delete process.env.LAYER_ONE_ALLOW_PROD_QUOTA_BYPASS;
    mocks.getSupabaseUser.mockReset();
    mocks.getActivePricingConfig.mockReset();
    mocks.getActivePricingConfig.mockResolvedValue(pricingConfig());
  });

  afterEach(() => {
    if (originalBypass === undefined) {
      delete process.env.LAYERS_BYPASS_QUOTA;
    } else {
      process.env.LAYERS_BYPASS_QUOTA = originalBypass;
    }
    if (originalLegacyBypass === undefined) {
      delete process.env.LAYER_ONE_BYPASS_QUOTA;
    } else {
      process.env.LAYER_ONE_BYPASS_QUOTA = originalLegacyBypass;
    }
    if (originalProductionBypass === undefined) {
      delete process.env.LAYERS_ALLOW_PROD_QUOTA_BYPASS;
    } else {
      process.env.LAYERS_ALLOW_PROD_QUOTA_BYPASS = originalProductionBypass;
    }
    if (originalLegacyProductionBypass === undefined) {
      delete process.env.LAYER_ONE_ALLOW_PROD_QUOTA_BYPASS;
    } else {
      process.env.LAYER_ONE_ALLOW_PROD_QUOTA_BYPASS =
        originalLegacyProductionBypass;
    }
  });

  it("allows unlimited meetings when local quota bypass is enabled", async () => {
    process.env.LAYERS_BYPASS_QUOTA = "true";

    const quota = await checkQuota();

    expect(quotaBypassEnabled()).toBe(true);
    expect(quota.allowed).toBe(true);
    expect(quota.bypassed).toBe(true);
    expect(quota.meetingLimit).toBeNull();
    expect(quota.minuteLimit).toBeNull();
    expect(quota.planId).toBe("bypass-unlimited");
    expect(mocks.getSupabaseUser).not.toHaveBeenCalled();
  });

  it("blocks free users at the lifetime meeting cap", async () => {
    mocks.getSupabaseUser.mockResolvedValue(
      supabaseMock({
        profile: null,
        meetings: Array.from({ length: 25 }, (_, i) => ({
          id: `m${i}`,
          duration_seconds: 60,
          created_at: new Date().toISOString(),
        })),
      }),
    );

    const quota = await checkQuota();

    expect(quota.allowed).toBe(false);
    expect(quota.reason).toBe("meeting_limit");
    expect(quota.planId).toBe("free");
  });

  it("blocks paid users at the configured monthly minute cap", async () => {
    mocks.getSupabaseUser.mockResolvedValue(
      supabaseMock({
        profile: { subscription_status: "active", subscription_tier: "core" },
        meetings: [
          { id: "m1", duration_seconds: 601 * 60, created_at: new Date().toISOString() },
        ],
      }),
    );

    const quota = await checkQuota();

    expect(quota.allowed).toBe(false);
    expect(quota.reason).toBe("minute_limit");
    expect(quota.planId).toBe("core");
    expect(quota.minuteLimit).toBe(600);
  });
});
