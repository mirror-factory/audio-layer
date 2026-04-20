export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { getMeetingsStore } from "@/lib/meetings/store";

const AutosaveSchema = z.object({
  meetingId: z.string().min(1),
  text: z.string().default(""),
  utterances: z.array(z.object({
    speaker: z.string().nullable(),
    text: z.string(),
    start: z.number(),
    end: z.number(),
    confidence: z.number(),
  })).default([]),
  durationSeconds: z.number().nullable().optional(),
});

/**
 * POST /api/transcribe/stream/autosave
 *
 * Lightweight partial save during live recording. Updates the meeting
 * row with the current transcript without running summarization.
 * Called every 30 seconds by the LiveRecorder component.
 */
export const POST = withRoute(async (request, _ctx) => {
  let body: z.infer<typeof AutosaveSchema>;
  try {
    body = AutosaveSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const store = await getMeetingsStore();

  await store.update(body.meetingId, {
    text: body.text,
    utterances: body.utterances,
    durationSeconds: body.durationSeconds ?? null,
    status: "processing",
  });

  return NextResponse.json({ saved: true, utteranceCount: body.utterances.length });
});
