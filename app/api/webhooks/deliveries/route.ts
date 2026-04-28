export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getCurrentUserId } from "@/lib/supabase/user";
import { getSupabaseServer } from "@/lib/supabase/server";

interface WebhookRow {
  id: string;
  url: string;
}

interface DeliveryRow {
  id: string;
  webhook_id: string;
  event: string;
  meeting_id: string;
  status_code: number | null;
  success: boolean;
  created_at: string;
}

export const GET = withRoute(async (req) => {
  const userId = await getCurrentUserId();
  if (!userId) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Database not configured" }, { status: 503 });
  }

  const limitParam = Number(new URL(req.url).searchParams.get("limit") ?? 10);
  const limit = Number.isFinite(limitParam)
    ? Math.min(Math.max(Math.trunc(limitParam), 1), 25)
    : 10;

  const { data: hooks, error: hooksError } = await supabase
    .from("webhooks")
    .select("id, url")
    .eq("user_id", userId);

  if (hooksError) {
    return NextResponse.json({ error: hooksError.message }, { status: 500 });
  }

  const webhookRows = (hooks ?? []) as WebhookRow[];
  if (webhookRows.length === 0) {
    return NextResponse.json({ deliveries: [] });
  }

  const hookUrls = new Map(webhookRows.map((hook) => [hook.id, hook.url]));
  const { data, error } = await supabase
    .from("webhook_deliveries")
    .select("id, webhook_id, event, meeting_id, status_code, success, created_at")
    .in("webhook_id", webhookRows.map((hook) => hook.id))
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    deliveries: ((data ?? []) as DeliveryRow[]).map((delivery) => ({
      id: delivery.id,
      webhookId: delivery.webhook_id,
      webhookUrl: hookUrls.get(delivery.webhook_id) ?? null,
      event: delivery.event,
      meetingId: delivery.meeting_id,
      statusCode: delivery.status_code,
      success: delivery.success,
      createdAt: delivery.created_at,
    })),
  });
});
