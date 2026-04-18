/**
 * AssemblyAI client — single source of truth for the SDK instance.
 *
 * Transcription goes DIRECT to AssemblyAI (not through the Vercel AI Gateway —
 * confirmed the Gateway does not route STT providers as of April 2026).
 *
 * Env:
 *   ASSEMBLYAI_API_KEY         — required
 *   ASSEMBLYAI_BATCH_MODEL     — default "best" (Universal-3 Pro pre-recorded)
 *   ASSEMBLYAI_STREAMING_MODEL — default "u3-rt-pro" (streaming, used by next PR)
 */

import { AssemblyAI } from "assemblyai";
import type { TranscriptParams } from "assemblyai";
import { getSettings } from "@/lib/settings";

function getApiKey(): string {
  const key = process.env.ASSEMBLYAI_API_KEY;
  if (!key) {
    throw new Error(
      "ASSEMBLYAI_API_KEY is not set. Add it to .env.local (see .env.example).",
    );
  }
  return key;
}

let cached: AssemblyAI | null = null;

export function getAssemblyAI(): AssemblyAI {
  if (cached) return cached;
  cached = new AssemblyAI({ apiKey: getApiKey() });
  return cached;
}

/** Test seam: reset the cached client (used by unit tests). */
export function __resetAssemblyAIClient(): void {
  cached = null;
}

/** Map legacy env value to the new speech_models array. */
export function getBatchSpeechModels(
  override?: string,
): TranscriptParams["speech_models"] {
  const model =
    override ?? process.env.ASSEMBLYAI_BATCH_MODEL ?? "universal-3-pro";
  // "best" was the old alias for Universal-3 Pro pre-recorded
  if (model === "best") return ["universal-3-pro"];
  return [model];
}

/** Read batch speech model from user settings (cookie). */
export async function getBatchSpeechModelsFromSettings(): Promise<
  TranscriptParams["speech_models"]
> {
  const settings = await getSettings();
  return getBatchSpeechModels(settings.batchSpeechModel);
}

/** Valid AssemblyAI streaming model IDs. */
const VALID_STREAMING_MODELS = new Set([
  "u3-rt-pro",
  "u3-rt-agent",
  "universal-streaming-english",
  "universal-streaming-multilingual",
  "whisper-rt",
  "alpha-english",
]);

/** Read streaming speech model from user settings (cookie). */
export async function getStreamingSpeechModel(): Promise<string> {
  const settings = await getSettings();
  const model = settings.streamingSpeechModel;
  // Validate against known models — fall back to u3-rt-pro if invalid
  if (VALID_STREAMING_MODELS.has(model)) return model;
  return "u3-rt-pro";
}
