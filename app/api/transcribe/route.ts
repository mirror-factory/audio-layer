export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getAssemblyAI, getBatchSpeechModelsFromSettings } from "@/lib/assemblyai/client";
import { checkQuota } from "@/lib/billing/quota";
import { getMeetingsStore } from "@/lib/meetings/store";
import { getCurrentUserId } from "@/lib/supabase/user";

const MAX_FILE_SIZE = 100 * 1024 * 1024; // 100MB

export const POST = withRoute(async (req, ctx) => {
  // Parse multipart form
  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json(
      { error: "Invalid form data" },
      { status: 400 },
    );
  }

  const audioFile = formData.get("audio");
  if (!audioFile || !(audioFile instanceof Blob) || audioFile.size === 0) {
    return NextResponse.json(
      { error: "Missing or empty audio file" },
      { status: 400 },
    );
  }

  // Check file size
  if (audioFile.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "File exceeds 100MB limit" },
      { status: 413 },
    );
  }

  // Quota check
  const quota = await checkQuota();
  if (!quota.allowed) {
    const limitCopy = quota.reason === "minute_limit"
      ? `${quota.planId} plan minute limit reached (${quota.monthlyMinutesUsed}/${quota.minuteLimit} min this month).`
      : `${quota.planId} plan meeting limit reached (${quota.meetingCount}/${quota.meetingLimit} meetings).`;
    return NextResponse.json(
      {
        error: `${limitCopy} Upgrade to continue.`,
        code: "free_limit_reached",
        upgradeUrl: "/pricing",
      },
      { status: 402 },
    );
  }

  const client = getAssemblyAI();
  if (!client) {
    return NextResponse.json(
      { error: "AssemblyAI is not configured" },
      { status: 502 },
    );
  }

  // Upload file to AssemblyAI
  const buf = Buffer.from(await audioFile.arrayBuffer());

  const uploadUrl = await withExternalCall(
    { vendor: "assemblyai", operation: "files.upload", requestId: ctx.requestId },
    () => client.files.upload(buf),
    { inputSummary: { audioBytes: buf.length } },
  );

  // Submit transcript job
  const speechModels = await getBatchSpeechModelsFromSettings();

  const transcript = await withExternalCall(
    { vendor: "assemblyai", operation: "transcripts.submit", requestId: ctx.requestId },
    () =>
      client.transcripts.submit({
        audio_url: uploadUrl,
        speech_models: speechModels,
        speaker_labels: true,
        entity_detection: true,
        punctuate: true,
        format_text: true,
      }),
    { inputSummary: { speechModels } },
  );

  // Insert placeholder row
  const store = await getMeetingsStore();
  const userId = await getCurrentUserId();

  await store.insert({
    id: transcript.id,
    status: "processing",
  });

  return NextResponse.json(
    { id: transcript.id, status: "processing" },
    { status: 202 },
  );
});
