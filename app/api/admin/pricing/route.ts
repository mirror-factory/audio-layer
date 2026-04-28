export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import {
  PricingConfigPayloadSchema,
  getPricingConfigStore,
  savePricingConfigDraft,
} from "@/lib/billing/pricing-config";

export async function GET(): Promise<NextResponse> {
  const store = await getPricingConfigStore();
  return NextResponse.json(store, {
    headers: { "cache-control": "no-store" },
  });
}

export async function PUT(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = PricingConfigPayloadSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_pricing_config",
        issues: parsed.error.issues.map((issue) => ({
          path: issue.path.join("."),
          message: issue.message,
        })),
      },
      { status: 400 },
    );
  }

  const store = await savePricingConfigDraft(parsed.data);
  return NextResponse.json(store, {
    headers: { "cache-control": "no-store" },
  });
}
