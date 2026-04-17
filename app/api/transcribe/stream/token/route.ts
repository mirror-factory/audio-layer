/**
 * POST /api/transcribe/stream/token
 *
 * Mints an ephemeral AssemblyAI streaming token for the browser to
 * connect directly to `wss://api.assemblyai.com/v3/realtime/ws`. The
 * server never proxies the audio stream — the token is scoped and
 * short-lived, so exposing it to the browser is safe.
 *
 * Side-effects:
 *   - Allocates a UUID meeting id and inserts a placeholder row in
 *     the MeetingsStore so the live session is visible in /meetings
 *     while it's running.
 *
 * Returns:
 *   { token, meetingId, expiresAt, sampleRate, speechModel }
 */

import { NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getAssemblyAI } from "@/lib/assemblyai/client";
import { getMeetingsStore } from "@/lib/meetings/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKEN_TTL_SECONDS = 600;          // 10 minutes — room to set up mic
const MAX_SESSION_SECONDS = 60 * 60;    // 1 hour per session
const SAMPLE_RATE = 16000;
const SPEECH_MODEL =
  process.env.ASSEMBLYAI_STREAMING_MODEL ?? "u3-rt-pro";

export async function POST(): Promise<NextResponse> {
  const client = getAssemblyAI();

  let token: string;
  try {
    token = await client.streaming.createTemporaryToken({
      expires_in_seconds: TOKEN_TTL_SECONDS,
      max_session_duration_seconds: MAX_SESSION_SECONDS,
    });
  } catch (err) {
    console.error("AssemblyAI token mint failed", err);
    return NextResponse.json(
      { error: `Token mint failed: ${(err as Error).message}` },
      { status: 502 },
    );
  }

  const meetingId = randomUUID();
  try {
    await (await getMeetingsStore()).insert({
      id: meetingId,
      status: "processing",
    });
  } catch (err) {
    console.error("Meetings store insert failed", err);
    // Non-fatal: /api/transcribe/stream/finalize will upsert.
  }

  return NextResponse.json({
    token,
    meetingId,
    expiresAt: Date.now() + TOKEN_TTL_SECONDS * 1000,
    sampleRate: SAMPLE_RATE,
    speechModel: SPEECH_MODEL,
  });
}
