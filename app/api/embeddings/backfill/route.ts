export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { getSupabaseServer } from "@/lib/supabase/server";
import { embedMeeting } from "@/lib/embeddings/embed-meeting";

/**
 * POST /api/embeddings/backfill
 *
 * Embeds all completed meetings that don't have embeddings yet.
 * Requires service-role access. Run once to backfill existing meetings.
 */
export const POST = withRoute(async (_req, ctx) => {
  const backfillSecret = process.env.EMBEDDINGS_BACKFILL_SECRET;
  if (!backfillSecret) {
    return NextResponse.json(
      { error: "Embeddings backfill is not configured" },
      { status: 503 },
    );
  }

  const authHeader = _req.headers.get("authorization");
  const bearer = authHeader?.startsWith("Bearer ") ? authHeader.slice(7) : null;
  const token = bearer ?? _req.headers.get("x-backfill-token");
  if (token !== backfillSecret) {
    return NextResponse.json(
      { error: "Backfill token required" },
      { status: 401 },
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
  }

  // Find completed meetings without embeddings
  const { data: meetings, error } = await supabase
    .from("meetings")
    .select("id, user_id, title, text")
    .eq("status", "completed")
    .not("text", "is", null)
    .gt("text", "")
    .order("created_at", { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Check which already have embeddings
  const { data: existing } = await supabase
    .from("meeting_embeddings")
    .select("meeting_id")
    .in("meeting_id", (meetings ?? []).map((m: { id: string }) => m.id));

  const existingIds = new Set((existing ?? []).map((e: { meeting_id: string }) => e.meeting_id));
  const toEmbed = (meetings ?? []).filter((m: { id: string }) => !existingIds.has(m.id));

  const results: { id: string; title: string; chunks: number; cost: number; error?: string }[] = [];

  for (const meeting of toEmbed) {
    try {
      const result = await embedMeeting(meeting.id, meeting.user_id);
      results.push({
        id: meeting.id,
        title: meeting.title ?? "Untitled",
        chunks: result.chunksEmbedded,
        cost: result.costUsd,
      });
    } catch (err) {
      results.push({
        id: meeting.id,
        title: meeting.title ?? "Untitled",
        chunks: 0,
        cost: 0,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  const totalChunks = results.reduce((s, r) => s + r.chunks, 0);
  const totalCost = results.reduce((s, r) => s + r.cost, 0);

  return NextResponse.json({
    backfilled: results.length,
    skipped: existingIds.size,
    totalChunks,
    totalCostUsd: totalCost,
    results,
  });
});
