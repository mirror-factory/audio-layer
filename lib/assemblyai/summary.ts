import { generateObject } from "ai";
import { gateway } from "@ai-sdk/gateway";
import { MeetingSummarySchema, type MeetingSummary } from "./schema";
import type { TranscribeUtterance } from "./types";
import { getSettings } from "@/lib/settings";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface UtteranceLike {
  speaker: string | null;
  text: string;
}

interface SummarizeOptions {
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
  skipped: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const MIN_TRANSCRIPT_LENGTH = 20;

export function formatTranscriptForPrompt(
  utterances: UtteranceLike[],
  fullText?: string,
): string {
  if (utterances.length > 0) {
    return utterances
      .map((u) => `${u.speaker ?? "Unknown"}: ${u.text}`)
      .join("\n");
  }
  return fullText ?? "";
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

export async function summarizeMeeting(
  options: SummarizeOptions,
): Promise<SummarizeResult> {
  const transcript = formatTranscriptForPrompt(
    options.utterances,
    options.fullText,
  );

  if (transcript.length < MIN_TRANSCRIPT_LENGTH) {
    return {
      summary: {
        title: "Untitled recording",
        summary: "The recording was too short to summarize.",
        keyPoints: [],
        actionItems: [],
        decisions: [],
        participants: [],
      },
      model: "none",
      usage: { inputTokens: 0, outputTokens: 0 },
      skipped: true,
    };
  }

  const modelId = options.modelId ?? (await getSettings()).summaryModel;
  const model = gateway(modelId);

  const { object, usage } = await generateObject({
    model,
    schema: MeetingSummarySchema,
    prompt: `You are a meeting summarizer. Analyze the following transcript and produce a structured summary.\n\n<transcript>\n${transcript}\n</transcript>`,
    experimental_telemetry: {
      isEnabled: true,
      functionId: "meeting-summary",
      metadata: {
        transcriptId: options.transcriptId,
      },
    },
  });

  return {
    summary: object,
    model: modelId,
    usage: {
      inputTokens: usage.inputTokens ?? 0,
      outputTokens: usage.outputTokens ?? 0,
      cachedInputTokens:
        usage.inputTokenDetails?.cacheReadTokens ?? undefined,
    },
    skipped: false,
  };
}
