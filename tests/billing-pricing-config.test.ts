import { mkdtempSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  DEFAULT_CUSTOMER_MIX,
  DEFAULT_PRICING_ASSUMPTIONS,
  DEFAULT_PRICING_PLANS,
} from "@/lib/billing/stt-pricing";

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => null,
}));

const {
  activatePricingConfigVersion,
  getPricingConfigStore,
  savePricingConfigDraft,
} = await import("@/lib/billing/pricing-config");

let tempDir: string;

beforeEach(() => {
  tempDir = mkdtempSync(join(tmpdir(), "layers-pricing-"));
  process.env.PRICING_CONFIG_FILE = join(tempDir, "pricing-config.json");
});

afterEach(() => {
  rmSync(tempDir, { force: true, recursive: true });
  delete process.env.PRICING_CONFIG_FILE;
});

describe("pricing config store", () => {
  it("creates a default active file store", async () => {
    const store = await getPricingConfigStore();

    expect(store.source).toBe("file");
    expect(store.active.status).toBe("active");
    expect(store.active.sttOptionId).toBe("deepgram:nova-3:streaming");
    expect(store.active.addonIds).toEqual(["speakerDiarization"]);
    expect(store.active.plans.find((plan) => plan.id === "free")?.meetingLimit).toBe(25);
    expect(store.active.plans.map((plan) => [plan.id, plan.monthlyPriceUsd])).toEqual([
      ["free", 0],
      ["core", 20],
      ["pro", 30],
    ]);
  });

  it("saves a draft and activates it", async () => {
    const draftStore = await savePricingConfigDraft({
      name: "Core 900 minute test",
      sttOptionId: "assemblyai:universal-streaming-multilingual:streaming",
      addonIds: [],
      assumptions: DEFAULT_PRICING_ASSUMPTIONS,
      plans: DEFAULT_PRICING_PLANS.map((plan) =>
        plan.id === "core" ? { ...plan, monthlyMinuteLimit: 900 } : plan,
      ),
      customerMix: DEFAULT_CUSTOMER_MIX,
    });

    const draft = draftStore.versions.find((version) => version.status === "draft");
    expect(draft).toBeDefined();

    const activeStore = await activatePricingConfigVersion(draft!.id);
    expect(activeStore.active.name).toBe("Core 900 minute test");
    expect(activeStore.active.plans.find((plan) => plan.id === "core")?.monthlyMinuteLimit).toBe(900);
    expect(activeStore.versions.find((version) => version.id === "default-active")?.status).toBe("archived");
  });
});
