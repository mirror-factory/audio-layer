/**
 * GET/PUT /api/settings
 *
 * Reads and writes model preferences stored in a cookie.
 * No auth required — settings are per-browser, not per-user.
 */

import { NextResponse } from "next/server";
import { getSettings, saveSettings, type ModelSettings } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(): Promise<NextResponse> {
  const settings = await getSettings();
  return NextResponse.json(settings);
}

export async function PUT(request: Request): Promise<NextResponse> {
  let body: Partial<ModelSettings>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid JSON body" },
      { status: 400 },
    );
  }

  const updated = await saveSettings(body);
  return NextResponse.json(updated);
}
