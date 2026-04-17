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

const SUPPORTED = new Set(["md", "markdown", "pdf"]);

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const format = (searchParams.get("format") ?? "md").toLowerCase();

  if (!SUPPORTED.has(format)) {
    return NextResponse.json(
      {
        error: `Unsupported export format '${format}'. Supported: md, pdf.`,
      },
      { status: 400 },
    );
  }

  const store = await getMeetingsStore();
  const meeting = await store.get(id);
  if (!meeting) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const stem = meetingFilenameStem(meeting);

  if (format === "pdf") {
    // Lazy-load to keep @react-pdf/renderer (heavy) out of the cold-
    // start path for the markdown export.
    const { meetingToPdfBuffer } = await import("@/lib/meetings/pdf");
    const buffer = await meetingToPdfBuffer(meeting);
    return new Response(new Uint8Array(buffer), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${stem}.pdf"`,
        "Cache-Control": "no-store",
      },
    });
  }

  const body = meetingToMarkdown(meeting);
  return new Response(body, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
      "Content-Disposition": `attachment; filename="${stem}.md"`,
      "Cache-Control": "no-store",
    },
  });
}
