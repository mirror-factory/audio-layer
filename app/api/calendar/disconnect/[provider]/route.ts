export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { parseCalendarProvider } from "@/lib/calendar/providers";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getCurrentUserId } from "@/lib/supabase/user";

export const POST = withRoute(async (_req, ctx) => {
  const provider = parseCalendarProvider(ctx.params?.provider);
  if (!provider) {
    return NextResponse.json({ error: "Invalid calendar provider" }, { status: 400 });
  }

  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  const { error } = await supabase
    .from("calendar_connections")
    .update({
      status: "disconnected",
      access_token_enc: null,
      refresh_token_enc: null,
      token_expires_at: null,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) {
    return NextResponse.json({ error: "Failed to disconnect calendar" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, provider });
});
