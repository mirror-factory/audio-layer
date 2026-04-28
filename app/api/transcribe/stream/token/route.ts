export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getAssemblyAI, getStreamingSpeechModel } from "@/lib/assemblyai/client";
import { checkQuota } from "@/lib/billing/quota";
import { getMeetingsStore } from "@/lib/meetings/store";
import { cleanRecordingTitle } from "@/lib/recording/meeting-context";

async function readOptionalJson(req: Request): Promise<unknown> {
  try {
    return await req.json();
  } catch {
    return {};
  }
}

export const POST = withRoute(async (req, ctx) => {
  const body = await readOptionalJson(req);
  const meetingTitle = cleanRecordingTitle(
    typeof body === "object" && body !== null
      ? (body as { meetingTitle?: unknown }).meetingTitle
      : null,
  );

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

  // Create the meeting row before minting a paid vendor token. If persistence
  // is unavailable, fail before creating an external session the app cannot save.
  const meetingId = crypto.randomUUID();
  const store = await getMeetingsStore();
  try {
    await store.insert({
      id: meetingId,
      status: "processing",
      title: meetingTitle,
    });
  } catch {
    return NextResponse.json(
      { error: "Unable to create meeting before streaming" },
      { status: 503 },
    );
  }

  let token: string;
  try {
    token = await withExternalCall(
      { vendor: "assemblyai", operation: "streaming.createTemporaryToken", requestId: ctx.requestId },
      () =>
        client.streaming.createTemporaryToken({
          expires_in_seconds: 600, // 10 min
        }),
    );
  } catch {
    await store.update(meetingId, {
      status: "error",
      error: "Unable to create streaming token",
    }).catch(() => null);
    return NextResponse.json(
      { error: "Unable to create streaming token" },
      { status: 502 },
    );
  }

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
