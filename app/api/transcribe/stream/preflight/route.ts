export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { getAssemblyAI } from "@/lib/assemblyai/client";
import { checkQuota } from "@/lib/billing/quota";
import { getActivePricingConfig } from "@/lib/billing/pricing-config";
import { buildRecordingPreflight } from "@/lib/recording/preflight";
import { getSettings } from "@/lib/settings";
import { withRoute } from "@/lib/with-route";

export const GET = withRoute(async () => {
  const [quota, pricing, settings] = await Promise.all([
    checkQuota(),
    getActivePricingConfig(),
    getSettings(),
  ]);

  return NextResponse.json(
    buildRecordingPreflight({
      quota,
      pricing,
      settings,
      providerConfigured: Boolean(getAssemblyAI()),
    }),
  );
});
