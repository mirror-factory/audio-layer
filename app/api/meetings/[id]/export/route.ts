/**
 * GET /api/meetings/[id]/export?format=md
 *
 * Streams a download of the meeting in the requested format.
 * Currently only `md` is supported. PDF is intentionally deferred —
 * use the browser's "Print → Save as PDF" on /meetings/[id] until we
 * add a server-side renderer (R&D needed: weight vs. value).
 *
 * Auth is handled by the underlying MeetingsStore (RLS) — the route
 * just returns 404 if the user's session can't see the row.
 */

import { NextResponse } from "next/server";
import { getMeetingsStore } from "@/lib/meetings/store";
import {
  meetingToMarkdown,
  meetingFilenameStem,
} from "@/lib/meetings/export";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "md").toLowerCase();

  if (format !== "md" && format !== "markdown") {
    return NextResponse.json(
      {
        error:
          `Unsupported export format '${format}'. Supported: md. PDF: print this page from the browser.`,
      },
      { status: 400 },
    );
  }

  const store = await getMeetingsStore();
  const meeting = await store.get(id);
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const body = meetingToMarkdown(meeting);
  const filename = `${meetingFilenameStem(meeting)}.md`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
