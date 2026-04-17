/**
 * GET /api/meetings/[id]
 *
 * Returns a single persisted meeting from the MeetingsStore. Read-only
 * — polling during active transcription still goes through
 * /api/transcribe/[id] so that completion triggers summarization.
 */

import { NextResponse } from "next/server";
import { getMeetingsStore } from "@/lib/meetings/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  try {
    const meeting = await (await getMeetingsStore()).get(id);
    if (!meeting) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
    return NextResponse.json(meeting);
  } catch (err) {
    console.error("Meetings get failed", err);
    return NextResponse.json(
      { error: `Fetch failed: ${(err as Error).message}` },
      { status: 500 },
    );
  }
}
