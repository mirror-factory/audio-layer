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

import { after, NextResponse } from "next/server";
import { z } from "zod";
import { summarizeMeeting } from "@/lib/assemblyai/summary";
import { extractIntakeForm } from "@/lib/assemblyai/intake";
import { estimateLlmCost } from "@/lib/billing/llm-pricing";
import { estimateStreamingMeetingCost } from "@/lib/billing/assemblyai-pricing";
import { flushLangfuse } from "@/lib/langfuse-setup";
import type {
  LlmCallRecord,
  MeetingCostBreakdown,
} from "@/lib/billing/types";
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

  // Run summary + intake extraction in parallel. Partial success —
  // either may fail without losing the transcript.
  const utterancesForLlm = utterances.map((u) => ({
    speaker: u.speaker,
    text: u.text,
  }));
  const [summaryRes, intakeRes] = await Promise.allSettled([
    summarizeMeeting({
      transcriptId: body.meetingId,
      utterances: utterancesForLlm,
      fullText: body.text,
    }),
    extractIntakeForm({
      transcriptId: body.meetingId,
      utterances: utterancesForLlm,
      fullText: body.text,
    }),
  ]);

  const summaryResult =
    summaryRes.status === "fulfilled" ? summaryRes.value : null;
  if (summaryRes.status === "rejected") {
    console.error("Streaming summary failed", summaryRes.reason);
  }
  const intakeResult =
    intakeRes.status === "fulfilled" ? intakeRes.value : null;
  if (intakeRes.status === "rejected") {
    console.error("Streaming intake extraction failed", intakeRes.reason);
  }

  const summary = summaryResult?.summary ?? null;
  const intakeForm = intakeResult?.intake ?? null;

  // Roll up LLM costs from the calls we actually made.
  const llmCalls: LlmCallRecord[] = [];
  if (summaryResult && !summaryResult.skipped) {
    llmCalls.push({
      label: "meeting-summary",
      model: summaryResult.model,
      inputTokens: summaryResult.usage.inputTokens,
      outputTokens: summaryResult.usage.outputTokens,
      cachedInputTokens: summaryResult.usage.cachedInputTokens,
      costUsd: estimateLlmCost(summaryResult.model, summaryResult.usage),
    });
  }
  if (intakeResult && !intakeResult.skipped) {
    llmCalls.push({
      label: "intake-form",
      model: intakeResult.model,
      inputTokens: intakeResult.usage.inputTokens,
      outputTokens: intakeResult.usage.outputTokens,
      cachedInputTokens: intakeResult.usage.cachedInputTokens,
      costUsd: estimateLlmCost(intakeResult.model, intakeResult.usage),
    });
  }

  const sttDuration = body.durationSeconds ?? 0;
  const sttEstimate = estimateStreamingMeetingCost(sttDuration, "u3-rt-pro");
  const llmTotalInput = llmCalls.reduce((a, c) => a + c.inputTokens, 0);
  const llmTotalOutput = llmCalls.reduce((a, c) => a + c.outputTokens, 0);
  const llmTotalCost = llmCalls.reduce((a, c) => a + c.costUsd, 0);
  const costBreakdown: MeetingCostBreakdown = {
    stt: {
      mode: "streaming",
      model: "u3-rt-pro",
      durationSeconds: sttDuration,
      ratePerHour: sttEstimate.ratePerHour,
      baseCostUsd: sttEstimate.baseCostUsd,
      addonCostUsd: sttEstimate.addonCostUsd,
      totalCostUsd: sttEstimate.totalCostUsd,
    },
    llm: {
      totalInputTokens: llmTotalInput,
      totalOutputTokens: llmTotalOutput,
      totalCostUsd: llmTotalCost,
      calls: llmCalls,
    },
    totalCostUsd: sttEstimate.totalCostUsd + llmTotalCost,
  };

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
    intakeForm,
    costBreakdown,
  });

  after(flushLangfuse);

  const response: TranscribeResultResponse = {
    id: body.meetingId,
    status: "completed",
    text: updated?.text ?? body.text,
    utterances: updated?.utterances ?? utterances,
    durationSeconds:
      updated?.durationSeconds ?? body.durationSeconds ?? undefined,
    summary: updated?.summary ?? summary ?? undefined,
    intakeForm: updated?.intakeForm ?? intakeForm ?? undefined,
  };
  return NextResponse.json(response);
}
