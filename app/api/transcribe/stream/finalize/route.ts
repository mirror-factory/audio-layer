/**
 * POST /api/transcribe/stream/finalize
 *
 * Called by the browser when a streaming session ends. Accepts the
 * accumulated utterances (one per AssemblyAI Turn event), generates a
 * MeetingSummary via the Gateway (Claude Sonnet 4.6, traced via
 * withTelemetry), and persists everything through the MeetingsStore.
 *
 * The client has seen the transcript live — this endpoint's job is
 * the durable write + summary, mirroring what /api/transcribe/[id]
 * does for batch jobs.
 */

import { NextResponse } from "next/server";
import { z } from "zod";
import { summarizeMeeting } from "@/lib/assemblyai/summary";
import { getMeetingsStore } from "@/lib/meetings/store";
import type {
  TranscribeResultResponse,
  TranscribeUtterance,
} from "@/lib/assemblyai/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UtteranceSchema = z.object({
  speaker: z.string().nullable(),
  text: z.string(),
  start: z.number(),
  end: z.number(),
  confidence: z.number(),
});

const FinalizeBodySchema = z.object({
  meetingId: z.string().min(1),
  text: z.string().default(""),
  utterances: z.array(UtteranceSchema).default([]),
  durationSeconds: z.number().nullable().optional(),
});

export async function POST(request: Request): Promise<NextResponse> {
  let body: z.infer<typeof FinalizeBodySchema>;
  try {
    const raw = await request.json();
    body = FinalizeBodySchema.parse(raw);
  } catch (err) {
    return NextResponse.json(
      { error: `Invalid request body: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const store = await getMeetingsStore();
  const utterances: TranscribeUtterance[] = body.utterances;

  // Generate summary. Partial success — if the LLM call fails we still
  // persist the transcript so the user doesn't lose their live notes.
  let summary = null;
  try {
    summary = await summarizeMeeting({
      transcriptId: body.meetingId,
      utterances: utterances.map((u) => ({
        speaker: u.speaker,
        text: u.text,
      })),
      fullText: body.text,
    });
  } catch (err) {
    console.error("Streaming summary failed", err);
  }

  // Upsert: if the token endpoint's insert failed we still recover.
  const existing = await store.get(body.meetingId).catch(() => null);
  if (!existing) {
    await store.insert({ id: body.meetingId, status: "completed" }).catch(() => {
      /* ignore */
    });
  }

  const updated = await store.update(body.meetingId, {
    status: "completed",
    title: summary?.title ?? null,
    text: body.text,
    utterances,
    durationSeconds: body.durationSeconds ?? null,
    summary,
  });

  const response: TranscribeResultResponse = {
    id: body.meetingId,
    status: "completed",
    text: updated?.text ?? body.text,
    utterances: updated?.utterances ?? utterances,
    durationSeconds:
      updated?.durationSeconds ?? body.durationSeconds ?? undefined,
    summary: updated?.summary ?? summary ?? undefined,
  };
  return NextResponse.json(response);
}
