export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { after } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";
import { getAssemblyAI } from "@/lib/assemblyai/client";
import { summarizeMeeting } from "@/lib/assemblyai/summary";
import { extractIntakeForm } from "@/lib/assemblyai/intake";
import { getMeetingsStore } from "@/lib/meetings/store";
import { estimateBatchMeetingCost } from "@/lib/billing/assemblyai-pricing";
import { estimateLlmCost } from "@/lib/billing/llm-pricing";
import { flushLangfuse } from "@/lib/langfuse-flush";
import { embedMeeting } from "@/lib/embeddings/embed-meeting";
import { EMBEDDING_MODEL } from "@/lib/embeddings/client";
import { getCurrentUserId } from "@/lib/supabase/user";
import type { MeetingCostBreakdown, LlmCallRecord } from "@/lib/billing/types";
import type { TranscribeUtterance } from "@/lib/assemblyai/types";

export const GET = withRoute(async (req, ctx) => {
  const id = ctx.params?.id as string;
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const store = await getMeetingsStore();

  // Fast path: return cached completed meeting
  const existing = await store.get(id);
  if (existing && existing.status === "completed" && existing.summary) {
    return NextResponse.json({
      id: existing.id,
      status: existing.status,
      text: existing.text,
      utterances: existing.utterances,
      durationSeconds: existing.durationSeconds,
      summary: existing.summary,
      intakeForm: existing.intakeForm,
      costBreakdown: existing.costBreakdown,
    });
  }

  // Fetch from AssemblyAI
  const client = getAssemblyAI();
  if (!client) {
    return NextResponse.json(
      { error: "AssemblyAI is not configured" },
      { status: 502 },
    );
  }

  const transcript = await withExternalCall(
    { vendor: "assemblyai", operation: "transcripts.get", requestId: ctx.requestId },
    () => client.transcripts.get(id),
  );

  // Not completed yet
  if (transcript.status !== "completed") {
    const status = transcript.status === "error" ? "error" : "processing";
    await store.update(id, {
      status,
      error: transcript.error ?? null,
    });
    return NextResponse.json({
      id,
      status,
      error: transcript.error ?? undefined,
    });
  }

  // Completed -- run summary + intake in parallel
  const utterances: TranscribeUtterance[] = (transcript.utterances ?? []).map(
    (u) => ({
      speaker: u.speaker ?? null,
      text: u.text,
      start: u.start,
      end: u.end,
      confidence: u.confidence,
    }),
  );

  const fullText = transcript.text ?? "";
  const durationSeconds = transcript.audio_duration ?? 0;

  const [summaryResult, intakeResult] = await Promise.allSettled([
    summarizeMeeting({
      transcriptId: id,
      utterances,
      fullText,
    }),
    extractIntakeForm({
      transcriptId: id,
      utterances,
      fullText,
    }),
  ]);

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const intake =
    intakeResult.status === "fulfilled" ? intakeResult.value : null;

  // Build cost breakdown
  const sttCost = estimateBatchMeetingCost(
    durationSeconds,
    transcript.speech_model ?? "universal-3-pro",
  );

  const llmCalls: LlmCallRecord[] = [];

  if (summary && !summary.skipped) {
    const cost = estimateLlmCost(summary.model, summary.usage);
    llmCalls.push({
      label: "meeting-summary",
      model: summary.model,
      inputTokens: summary.usage.inputTokens,
      outputTokens: summary.usage.outputTokens,
      cachedInputTokens: summary.usage.cachedInputTokens,
      costUsd: cost,
    });
  }

  if (intake && !intake.skipped) {
    const cost = estimateLlmCost(intake.model, intake.usage);
    llmCalls.push({
      label: "intake-form",
      model: intake.model,
      inputTokens: intake.usage.inputTokens,
      outputTokens: intake.usage.outputTokens,
      cachedInputTokens: intake.usage.cachedInputTokens,
      costUsd: cost,
    });
  }

  const llmTotalCost = llmCalls.reduce((s, c) => s + c.costUsd, 0);
  const costBreakdown: MeetingCostBreakdown = {
    stt: sttCost,
    llm: {
      totalInputTokens: llmCalls.reduce((s, c) => s + c.inputTokens, 0),
      totalOutputTokens: llmCalls.reduce((s, c) => s + c.outputTokens, 0),
      totalCostUsd: llmTotalCost,
      calls: llmCalls,
    },
    totalCostUsd: sttCost.totalCostUsd + llmTotalCost,
  };

  // Persist
  await store.update(id, {
    status: "completed",
    title: summary?.summary.title ?? null,
    text: fullText,
    utterances,
    durationSeconds,
    summary: summary?.summary ?? null,
    intakeForm: intake?.intake ?? null,
    costBreakdown,
  });

  // Auto-embed in background so it doesn't block the response
  after(async () => {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const embedResult = await embedMeeting(id, userId);
        if (embedResult.chunksEmbedded > 0) {
          // Update cost breakdown with embedding cost
          const updatedBreakdown: MeetingCostBreakdown = {
            ...costBreakdown,
            embedding: {
              model: EMBEDDING_MODEL,
              totalTokens: embedResult.totalTokens,
              totalCostUsd: embedResult.costUsd,
            },
            totalCostUsd: costBreakdown.totalCostUsd + embedResult.costUsd,
          };
          await store.update(id, { costBreakdown: updatedBreakdown });
        }
      }
    } catch {
      // Embedding failure should not break the transcription flow
    }
    await flushLangfuse();
  });

  return NextResponse.json({
    id,
    status: "completed",
    text: fullText,
    utterances,
    durationSeconds,
    summary: summary?.summary ?? null,
    intakeForm: intake?.intake ?? null,
    costBreakdown,
  });
});
