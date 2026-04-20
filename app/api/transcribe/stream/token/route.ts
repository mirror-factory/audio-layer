export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getAssemblyAI, getStreamingSpeechModel } from "@/lib/assemblyai/client";
import { checkQuota } from "@/lib/billing/quota";
import { getMeetingsStore } from "@/lib/meetings/store";

export const POST = withRoute(async (req, ctx) => {
  // Quota check
  const quota = await checkQuota();
  if (!quota.allowed) {
    return NextResponse.json(
      {
        error: "Free tier limit reached (25 meetings). Upgrade to continue.",
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

  // Mint ephemeral streaming token
  const token = await withExternalCall(
    { vendor: "assemblyai", operation: "realtime.createTemporaryToken", requestId: ctx.requestId },
    () =>
      client.realtime.createTemporaryToken({
        expires_in: 600, // 10 min
      }),
  );

  // Generate UUID meeting ID
  const meetingId = crypto.randomUUID();

  // Insert placeholder row
  const store = await getMeetingsStore();
  await store.insert({
    id: meetingId,
    status: "processing",
  });

  // Read streaming speech model from settings
  const speechModel = await getStreamingSpeechModel();

  return NextResponse.json({
    token: token,
    meetingId,
    expiresAt: Date.now() + 600_000,
    sampleRate: 16000,
    speechModel,
  });
});
