/**
 * GET /api/transcribe/[id]
 *
 * The client polls this until status === 'completed' or 'error'. On
 * the first successful completion we:
 *   1. Fetch the transcript from AssemblyAI
 *   2. Generate a structured MeetingSummary via the Gateway (Claude
 *      Sonnet 4.6 default) — traced through withTelemetry -> Langfuse
 *   3. Persist transcript + summary into the MeetingsStore
 *
 * On subsequent polls we serve the cached row from the store instead
 * of re-billing AssemblyAI + the LLM.
 */

import { NextResponse } from "next/server";
import { getAssemblyAI } from "@/lib/assemblyai/client";
import { summarizeMeeting } from "@/lib/assemblyai/summary";
import { extractIntakeForm } from "@/lib/assemblyai/intake";
import { getMeetingsStore, type MeetingsStore } from "@/lib/meetings/store";
import type {
  TranscribeResultResponse,
  TranscribeStatus,
  TranscribeUtterance,
} from "@/lib/assemblyai/types";
import type { MeetingUpdate } from "@/lib/meetings/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> },
): Promise<NextResponse> {
  const { id } = await context.params;

  if (!id || typeof id !== "string") {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const store = await getMeetingsStore();

  // Fast path: meeting is already completed in the store — return it.
  const existing = await store.get(id);
  if (existing?.status === "completed" && existing.summary) {
    return NextResponse.json(meetingToResponse(existing));
  }

  // Otherwise consult AssemblyAI for the latest status.
  const client = getAssemblyAI();
  let transcript;
  try {
    transcript = await client.transcripts.get(id);
  } catch (err) {
    console.error("AssemblyAI get failed", err);
    return NextResponse.json(
      { error: `Fetch transcript failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const status: TranscribeStatus = mapStatus(transcript.status);

  // Still in progress or errored — mirror the status into the store
  // (creating the row lazily if insert failed earlier) and return.
  if (status !== "completed") {
    await upsertStatus(store, id, status, transcript.error ?? null);
    const body: TranscribeResultResponse = {
      id,
      status,
      error: transcript.error ?? undefined,
    };
    return NextResponse.json(body);
  }

  // Completed path.
  const utterances: TranscribeUtterance[] = (transcript.utterances ?? []).map(
    (u) => ({
      speaker: u.speaker ?? null,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    }),
  );

  // Generate summary + intake form in parallel. Either may fail
  // independently — partial success is preferable to a 500.
  const utterancesForLlm = utterances.map((u) => ({
    speaker: u.speaker,
    text: u.text,
  }));

  let summary = existing?.summary ?? null;
  let intakeForm = existing?.intakeForm ?? null;
  if (!summary || !intakeForm) {
    const [summaryResult, intakeResult] = await Promise.allSettled([
      summary
        ? Promise.resolve(summary)
        : summarizeMeeting({
            transcriptId: id,
            utterances: utterancesForLlm,
            fullText: transcript.text ?? undefined,
          }),
      intakeForm
        ? Promise.resolve(intakeForm)
        : extractIntakeForm({
            transcriptId: id,
            utterances: utterancesForLlm,
            fullText: transcript.text ?? undefined,
          }),
    ]);
    if (summaryResult.status === "fulfilled") summary = summaryResult.value;
    else console.error("Summary generation failed", summaryResult.reason);
    if (intakeResult.status === "fulfilled") intakeForm = intakeResult.value;
    else console.error("Intake extraction failed", intakeResult.reason);
  }

  // Persist everything we know so future polls short-circuit.
  const persisted = await upsertCompleted(store, id, {
    status: "completed",
    title: summary?.title ?? null,
    text: transcript.text ?? null,
    utterances,
    durationSeconds: transcript.audio_duration ?? null,
    summary,
    intakeForm,
  });

  return NextResponse.json(meetingToResponse(persisted));
}

function mapStatus(s: string | null | undefined): TranscribeStatus {
  if (s === "completed") return "completed";
  if (s === "error") return "error";
  if (s === "queued") return "queued";
  return "processing";
}

async function upsertStatus(
  store: MeetingsStore,
  id: string,
  status: TranscribeStatus,
  error: string | null,
): Promise<void> {
  const existing = await store.get(id);
  if (!existing) {
    await store.insert({ id, status }).catch(() => {
      /* swallow: next poll will retry */
    });
  }
  await store.update(id, { status, error }).catch(() => {
    /* swallow: non-fatal */
  });
}

async function upsertCompleted(
  store: MeetingsStore,
  id: string,
  patch: MeetingUpdate,
) {
  const existing = await store.get(id);
  if (!existing) {
    await store.insert({ id, status: "completed" }).catch(() => {});
  }
  const updated = await store.update(id, patch);
  // Fallback shape in case persistence failed — the response still has
  // everything the client needs.
  return (
    updated ?? {
      id,
      status: "completed" as TranscribeStatus,
      title: patch.title ?? null,
      text: patch.text ?? null,
      utterances: patch.utterances ?? [],
      durationSeconds: patch.durationSeconds ?? null,
      summary: patch.summary ?? null,
      intakeForm: patch.intakeForm ?? null,
      error: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }
  );
}

function meetingToResponse(m: {
  id: string;
  status: TranscribeStatus;
  text: string | null;
  utterances: TranscribeUtterance[];
  durationSeconds: number | null;
  summary: TranscribeResultResponse["summary"] | null;
  intakeForm: TranscribeResultResponse["intakeForm"] | null;
  error: string | null;
}): TranscribeResultResponse {
  return {
    id: m.id,
    status: m.status,
    text: m.text ?? undefined,
    utterances: m.utterances,
    durationSeconds: m.durationSeconds ?? undefined,
    summary: m.summary ?? undefined,
    intakeForm: m.intakeForm ?? undefined,
    error: m.error ?? undefined,
  };
}
