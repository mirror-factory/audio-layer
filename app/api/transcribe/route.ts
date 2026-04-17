/**
 * POST /api/transcribe
 *
 * Accepts a multipart form with an `audio` file, uploads it to AssemblyAI,
 * submits a transcript job with speaker labels + entity detection, and
 * returns the job id. The client then polls GET /api/transcribe/[id].
 *
 * Summaries are generated on first completed GET (see [id]/route.ts) so
 * that the summary LLM call flows through withTelemetry -> Langfuse.
 *
 * Runtime: nodejs (AssemblyAI SDK needs Node APIs; edge won't work).
 * Body size: Next.js 15 default for route handlers handles multipart fine
 * for files up to ~50MB; larger files should use storage-backed flow
 * (client uploads to Supabase Storage, sends signed URL here) — tracked
 * for a future PR.
 */

import { NextResponse } from "next/server";
import { getAssemblyAI, getBatchModel } from "@/lib/assemblyai/client";
import type { TranscribeStartResponse } from "@/lib/assemblyai/types";
import { getMeetingsStore } from "@/lib/meetings/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_FILE_BYTES = 100 * 1024 * 1024; // 100 MB sanity cap

export async function POST(request: Request): Promise<NextResponse> {
  let form: FormData;
  try {
    form = await request.formData();
  } catch (err) {
    return NextResponse.json(
      { error: `Failed to parse multipart form: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  const file = form.get("audio");
  if (!(file instanceof Blob)) {
    return NextResponse.json(
      { error: "Missing 'audio' file in form data" },
      { status: 400 },
    );
  }

  if (file.size === 0) {
    return NextResponse.json(
      { error: "Uploaded audio file is empty" },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      {
        error: `Audio file exceeds ${MAX_FILE_BYTES} bytes; use storage-backed upload`,
      },
      { status: 413 },
    );
  }

  const client = getAssemblyAI();

  let uploadUrl: string;
  try {
    const buf = Buffer.from(await file.arrayBuffer());
    uploadUrl = await client.files.upload(buf);
  } catch (err) {
    console.error("AssemblyAI upload failed", err);
    return NextResponse.json(
      { error: `Upload to AssemblyAI failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  let transcript;
  try {
    transcript = await client.transcripts.submit({
      audio_url: uploadUrl,
      speech_model: getBatchModel(),
      speaker_labels: true,
      entity_detection: true,
      punctuate: true,
      format_text: true,
    });
  } catch (err) {
    console.error("AssemblyAI submit failed", err);
    return NextResponse.json(
      { error: `Submit to AssemblyAI failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const status = mapStatus(transcript.status);

  // Persist a placeholder row so the meeting is visible in the list UI
  // while AssemblyAI processes the audio. The [id] GET route fills in
  // the transcript + summary on completion.
  try {
    await (await getMeetingsStore()).insert({ id: transcript.id, status });
  } catch (err) {
    console.error("Meetings store insert failed", err);
    // Non-fatal: fall through with the AssemblyAI id. Subsequent GETs
    // will create the row lazily if it's still missing.
  }

  const body: TranscribeStartResponse = { id: transcript.id, status };
  return NextResponse.json(body, { status: 202 });
}

function mapStatus(s: string | null | undefined) {
  if (s === "completed") return "completed" as const;
  if (s === "error") return "error" as const;
  if (s === "queued") return "queued" as const;
  return "processing" as const;
}
