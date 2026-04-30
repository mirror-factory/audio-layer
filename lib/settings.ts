/**
 * Cookie-based model settings (server-only).
 *
 * Cookie: "audio-layer-settings", httpOnly, sameSite=lax, maxAge=1 year.
 * Fallback chain: cookie -> env var -> hardcoded default.
 */

import { cookies } from "next/headers";
import { DEFAULTS } from "./settings-shared";
import type { ModelSettings } from "./settings-shared";

export type { ModelSettings };
export { DEFAULTS };

const COOKIE_NAME = "audio-layer-settings";
const ONE_YEAR = 60 * 60 * 24 * 365;

export async function getSettings(): Promise<ModelSettings> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  let saved: Partial<ModelSettings> = {};
  if (raw) {
    try {
      saved = JSON.parse(raw);
    } catch {
      /* corrupted cookie — use defaults */
    }
  }
  return {
    summaryModel:
      saved.summaryModel ||
      process.env.DEFAULT_MODEL ||
      DEFAULTS.summaryModel,
    batchSpeechModel:
      saved.batchSpeechModel ||
      process.env.ASSEMBLYAI_BATCH_MODEL ||
      DEFAULTS.batchSpeechModel,
    streamingSpeechModel:
      saved.streamingSpeechModel ||
      process.env.DEEPGRAM_STREAMING_MODEL ||
      process.env.ASSEMBLYAI_STREAMING_MODEL ||
      DEFAULTS.streamingSpeechModel,
  };
}

export async function saveSettings(
  partial: Partial<ModelSettings>,
): Promise<ModelSettings> {
  const current = await getSettings();
  const merged: ModelSettings = { ...current, ...partial };
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(merged), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: ONE_YEAR,
  });
  return merged;
}
