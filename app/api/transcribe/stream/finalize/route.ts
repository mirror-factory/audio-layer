export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { after } from "next/server";
import { z } from "zod";
import { withRoute } from "@/lib/with-route";
import { summarizeMeeting } from "@/lib/assemblyai/summary";
import { extractIntakeForm } from "@/lib/assemblyai/intake";
import { getMeetingsStore } from "@/lib/meetings/store";
import { getSettings } from "@/lib/settings";
import { estimateStreamingMeetingCost } from "@/lib/billing/assemblyai-pricing";
import { estimateLlmCost } from "@/lib/billing/llm-pricing";
import { flushLangfuse } from "@/lib/langfuse-flush";
import { embedMeeting } from "@/lib/embeddings/embed-meeting";
import { EMBEDDING_MODEL } from "@/lib/embeddings/client";
import { getCurrentUserId } from "@/lib/supabase/user";
import type { MeetingCostBreakdown, LlmCallRecord } from "@/lib/billing/types";

const FinalizeBodySchema = z.object({
  meetingId: z.string().min(1),
  text: z.string().default(""),
  utterances: z
    .array(
      z.object({
        speaker: z.string().nullable(),
        text: z.string(),
        start: z.number(),
        end: z.number(),
        confidence: z.number(),
      }),
    )
    .default([]),
  durationSeconds: z.number().nullable().optional(),
});

export const POST = withRoute(async (req, ctx) => {
  // Validate body
  let body: z.infer<typeof FinalizeBodySchema>;
  try {
    const raw = await req.json();
    body = FinalizeBodySchema.parse(raw);
  } catch (err) {
    const zodErrors = err instanceof z.ZodError ? err.issues : null;
    return NextResponse.json(
      { error: zodErrors ?? "Invalid request body" },
      { status: 400 },
    );
  }

  const { meetingId, text, utterances, durationSeconds } = body;

  // Run summary + intake in parallel
  const [summaryResult, intakeResult] = await Promise.allSettled([
    summarizeMeeting({
      transcriptId: meetingId,
      utterances,
      fullText: text,
    }),
    extractIntakeForm({
      transcriptId: meetingId,
      utterances,
      fullText: text,
    }),
  ]);

  const summary =
    summaryResult.status === "fulfilled" ? summaryResult.value : null;
  const intake =
    intakeResult.status === "fulfilled" ? intakeResult.value : null;

  // Compute cost breakdown
  const settings = await getSettings();
  const sttCost = estimateStreamingMeetingCost(
    durationSeconds ?? 0,
    settings.streamingSpeechModel,
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

  // Upsert meeting
  const store = await getMeetingsStore();
  const meeting = await store.update(meetingId, {
    status: "completed",
    title: summary?.summary.title ?? null,
    text,
    utterances,
    durationSeconds: durationSeconds ?? null,
    summary: summary?.summary ?? null,
    intakeForm: intake?.intake ?? null,
    costBreakdown,
  });

  // Auto-embed in background so it doesn't block the response
  after(async () => {
    try {
      const userId = await getCurrentUserId();
      if (userId) {
        const embedResult = await embedMeeting(meetingId, userId);
        if (embedResult.chunksEmbedded > 0) {
          const updatedBreakdown: MeetingCostBreakdown = {
            ...costBreakdown,
            embedding: {
              model: EMBEDDING_MODEL,
              totalTokens: embedResult.totalTokens,
              totalCostUsd: embedResult.costUsd,
            },
            totalCostUsd: costBreakdown.totalCostUsd + embedResult.costUsd,
          };
          await store.update(meetingId, { costBreakdown: updatedBreakdown });
        }
      }
    } catch {
      // Embedding failure should not break the finalize flow
    }
    await flushLangfuse();
  });

  return NextResponse.json({
    id: meetingId,
    status: "completed",
    text,
    utterances,
    durationSeconds: durationSeconds ?? null,
    summary: summary?.summary ?? null,
    intakeForm: intake?.intake ?? null,
    costBreakdown,
  });
});
