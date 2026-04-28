import { AssemblyAI } from "assemblyai";
import type { TranscriptParams } from "assemblyai";
import { getSettings } from "@/lib/settings";
import { DEFAULTS, MODEL_OPTIONS } from "@/lib/settings-shared";

let instance: AssemblyAI | null = null;

/**
 * AssemblyAI SDK singleton. Returns null when API key is missing.
 */
export function getAssemblyAI(): AssemblyAI | null {
  if (instance) return instance;

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) return null;

  instance = new AssemblyAI({ apiKey });
  return instance;
}

const VALID_BATCH_MODELS = MODEL_OPTIONS.batchSpeech.map((m) => m.value);
const VALID_STREAMING_MODELS = MODEL_OPTIONS.streamingSpeech.map(
  (m) => m.value,
);

/**
 * Resolve a batch speech model string to the speech_models array format.
 * Handles the deprecated "best" alias -> ["universal-3-pro"].
 */
export function getBatchSpeechModels(
  override?: string,
): TranscriptParams["speech_models"] {
  const model =
    override ?? process.env.ASSEMBLYAI_BATCH_MODEL ?? DEFAULTS.batchSpeechModel;
  if (model === "best") return ["universal-3-pro"];
  return [model];
}

/**
 * Read batch speech model from user settings cookie and return the
 * speech_models array for the AssemblyAI API.
 */
export async function getBatchSpeechModelsFromSettings(): Promise<
  TranscriptParams["speech_models"]
> {
  const settings = await getSettings();
  return getBatchSpeechModels(settings.batchSpeechModel);
}

/**
 * Validate and return a streaming speech model ID.
 * Falls back to the user's settings cookie, then env, then default.
 */
export async function getStreamingSpeechModel(
  override?: string,
): Promise<string> {
  const model =
    override ??
    (await getSettings()).streamingSpeechModel ??
    process.env.ASSEMBLYAI_STREAMING_MODEL ??
    DEFAULTS.streamingSpeechModel;

  if (VALID_STREAMING_MODELS.includes(model)) return model;

  console.warn(
    `[assemblyai] Invalid streaming model "${model}", falling back to ${DEFAULTS.streamingSpeechModel}`,
  );
  return DEFAULTS.streamingSpeechModel;
}

export { VALID_BATCH_MODELS, VALID_STREAMING_MODELS };
