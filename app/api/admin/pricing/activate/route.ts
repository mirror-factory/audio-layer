export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { activatePricingConfigVersion } from "@/lib/billing/pricing-config";

const ActivateSchema = z.object({
  id: z.string().min(1),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "invalid_json", message: "Request body must be valid JSON." },
      { status: 400 },
    );
  }

  const parsed = ActivateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "invalid_activation", message: "Pricing version id is required." },
      { status: 400 },
    );
  }

  try {
    const store = await activatePricingConfigVersion(parsed.data.id);
    return NextResponse.json(store, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    return NextResponse.json(
      {
        error: "activation_failed",
        message: error instanceof Error ? error.message : "Unable to activate pricing version.",
      },
      { status: 404 },
    );
  }
}
