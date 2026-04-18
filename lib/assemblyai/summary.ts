/**
 * Meeting summary generator.
 *
 * Takes AssemblyAI utterances (speaker-segmented transcript) and produces a
 * structured MeetingSummary via generateObject through the Vercel AI Gateway.
 * Every call is traced through withTelemetry -> Langfuse + /observability.
 *
 * Returns the summary, the model id that was used, and the token usage so
 * callers can compute and persist cost. Empty-input short-circuits into
 * a zero-cost sentinel so we never bill for silence.
 */

import { generateObject } from "ai";
import { withTelemetry } from "@/lib/ai/telemetry";
import { MeetingSummarySchema, type MeetingSummary } from "./schema";
import { getSettings } from "@/lib/settings";

export interface UtteranceLike {
  speaker: string | null;
  text: string;
}

/** Render utterances as "Speaker A: ..." lines for the LLM. */
export function formatTranscriptForPrompt(utterances: UtteranceLike[]): string {
  return utterances
    .map((u) => `${u.speaker ? `Speaker ${u.speaker}` : "Speaker"}: ${u.text}`)
    .join("\n");
}

export interface SummarizeOptions {
  transcriptId: string;
  utterances: UtteranceLike[];
  fullText?: string;
  modelId?: string;
}

export interface SummarizeResult {
  summary: MeetingSummary;
  model: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
    cachedInputTokens?: number;
  };
  /** True when we short-circuited without calling the LLM. */
  skipped: boolean;
}

/**
 * Produce a structured summary for a completed transcript. Prefers
 * speaker-segmented utterances; falls back to full text if absent.
 */
export async function summarizeMeeting(
  opts: SummarizeOptions,
): Promise<SummarizeResult> {
  const { transcriptId, utterances, fullText, modelId } = opts;

  const body =
    utterances.length > 0
      ? formatTranscriptForPrompt(utterances)
      : (fullText ?? "");

  if (!body.trim()) {
    // Guard against empty input — the LLM would hallucinate without
    // grounding. Skip settings lookup (which needs a request scope)
    // and return the sentinel with a best-effort model label.
    return {
      summary: {
        title: "Silent recording",
        summary: "No speech was detected in this recording.",
        keyPoints: [],
        actionItems: [],
        decisions: [],
        participants: [],
      },
      model: modelId ?? "unknown",
      usage: { inputTokens: 0, outputTokens: 0 },
      skipped: true,
    };
  }

  const settings = await getSettings();
  const model = modelId ?? settings.summaryModel;

  const prompt =
    "You are producing a structured summary of a meeting transcript.\n" +
    "Only use information present in the transcript; do not invent facts.\n" +
    "If a field has no evidence in the transcript, return an empty array or 'unknown'.\n\n" +
    "Transcript:\n" +
    body;

  const { object, usage } = await generateObject({
    model,
    schema: MeetingSummarySchema,
    prompt,
    ...withTelemetry({
      label: "meeting-summary",
      metadata: { transcriptId },
    }),
  });

  return {
    summary: object,
    model,
    usage: {
      inputTokens: usage?.inputTokens ?? 0,
      outputTokens: usage?.outputTokens ?? 0,
      cachedInputTokens: usage?.cachedInputTokens,
    },
    skipped: false,
  };
}
