export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { getMeetingsStore } from "@/lib/meetings/store";
import { cleanRecordingTitle } from "@/lib/recording/meeting-context";

const AutosaveSchema = z.object({
  meetingId: z.string().min(1),
  meetingTitle: z.string().max(200).optional(),
  calendarEventId: z.string().max(300).optional(),
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
  void _ctx;
  let body: z.infer<typeof AutosaveSchema>;
  try {
    body = AutosaveSchema.parse(await request.json());
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const store = await getMeetingsStore();
  const meetingTitle = cleanRecordingTitle(body.meetingTitle);

  await store.update(body.meetingId, {
    ...(meetingTitle ? { title: meetingTitle } : {}),
    text: body.text,
    utterances: body.utterances,
    durationSeconds: body.durationSeconds ?? null,
    status: "processing",
  });

  return NextResponse.json({ saved: true, utteranceCount: body.utterances.length });
});
