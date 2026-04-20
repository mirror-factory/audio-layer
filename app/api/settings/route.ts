export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getSettings, saveSettings } from "@/lib/settings";

export const GET = withRoute(async () => {
  const settings = await getSettings();
  return NextResponse.json(settings);
});

export const PUT = withRoute(async (req) => {
  const partial = await req.json();
  const merged = await saveSettings(partial);
  return NextResponse.json(merged);
});
