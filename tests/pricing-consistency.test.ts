import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { DEFAULT_PRICING_PLANS } from "@/lib/billing/stt-pricing";

const ROOT = fileURLToPath(new URL("..", import.meta.url));

const PRICING_COPY_FILES = [
  "app/pricing/page.tsx",
  "app/landing.tsx",
  "app/docs/page.tsx",
  "docs/PRICING_AND_BILLING.md",
  "docs/BUILD_SPEC.md",
] as const;

function source(file: string): string {
  return readFileSync(resolve(ROOT, file), "utf8");
}

describe("launch pricing consistency", () => {
  it("keeps default billing config on Free $0, Core $20, Pro $30", () => {
    expect(DEFAULT_PRICING_PLANS.map((plan) => [plan.id, plan.monthlyPriceUsd])).toEqual([
      ["free", 0],
      ["core", 20],
      ["pro", 30],
    ]);
  });

  it("keeps pricing page cards on the launch prices", () => {
    const pricingPage = source("app/pricing/page.tsx");

    expect(pricingPage).toMatch(/name: "Free"[\s\S]*?price: "\$0"/);
    expect(pricingPage).toMatch(/name: "Core"[\s\S]*?price: "\$20"/);
    expect(pricingPage).toMatch(/name: "Pro"[\s\S]*?price: "\$30"/);
  });

  it("keeps landing and docs billing copy on the launch prices", () => {
    const landingPage = source("app/landing.tsx");
    const docsPage = source("app/docs/page.tsx");

    expect(landingPage).toMatch(/name: "Free"[\s\S]*?price: "\$0"/);
    expect(landingPage).toMatch(/name: "Core"[\s\S]*?price: "\$20"/);
    expect(landingPage).toMatch(/name: "Pro"[\s\S]*?price: "\$30"/);
    expect(docsPage).toContain("Core ($20/mo)");
    expect(docsPage).toContain("Pro ($30/mo)");
  });

  it("keeps launch docs on the current paid prices and env names", () => {
    const pricingDoc = source("docs/PRICING_AND_BILLING.md");
    const buildSpec = source("docs/BUILD_SPEC.md");

    expect(pricingDoc).toContain("Core tier ($20/mo)");
    expect(pricingDoc).toContain("Pro tier ($30/mo)");
    expect(buildSpec).toContain("Core ($20/mo) / Pro ($30/mo)");
    expect(buildSpec).toContain('Products -> create "Core" $20/mo recurring');
    expect(buildSpec).toContain('Products -> create "Pro" $30/mo recurring');
    expect(buildSpec).toContain("`STRIPE_PRICE_CORE`");
    expect(buildSpec).toContain("`STRIPE_PRICE_PRO`");
  });

  it("does not retain stale $15 or $25 paid-plan copy", () => {
    for (const file of PRICING_COPY_FILES) {
      const stalePaidPlanLines = source(file)
        .split("\n")
        .filter((line) => /\b(Core|Pro)\b|STRIPE_PRICE|Billing: Free/.test(line))
        .filter((line) => /\$(?:15|25)(?![0-9])/.test(line));

      expect(stalePaidPlanLines, file).toEqual([]);
    }
  });
});
