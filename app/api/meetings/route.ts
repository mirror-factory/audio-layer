/**
 * GET /api/meetings
 *
 * Returns the most recent meetings as lightweight list items. Used by
 * the /meetings page. Default limit 50, max 200.
 */

import { NextResponse } from "next/server";
import { getMeetingsStore } from "@/lib/meetings/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_LIMIT = 50;
const MAX_LIMIT = 200;

export async function GET(request: Request): Promise<NextResponse> {
  const { searchParams } = new URL(request.url);
  const raw = parseInt(
    searchParams.get("limit") ?? String(DEFAULT_LIMIT),
    10,
  );
  const limit = Number.isFinite(raw)
    ? Math.max(1, Math.min(MAX_LIMIT, raw))
    : DEFAULT_LIMIT;

  try {
    const items = await (await getMeetingsStore()).list(limit);
    return NextResponse.json({ items });
  } catch (err) {
    console.error("Meetings list failed", err);
    return NextResponse.json(
      { error: `List failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
