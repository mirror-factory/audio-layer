/**
 * User model preferences — server-only.
 *
 * Stored in a JSON cookie so they work with or without Supabase.
 * Server-side reads via `getSettings()`, writes via `/api/settings`.
 * Each field falls back to the env var, then to a hardcoded default.
 *
 * For types and constants safe to use in client components,
 * import from `@/lib/settings-shared` instead.
 */

import { cookies } from "next/headers";
import { DEFAULTS, type ModelSettings } from "./settings-shared";

export type { ModelSettings } from "./settings-shared";

const COOKIE_NAME = "audio-layer-settings";

/** Read current settings from the cookie, merging with env + defaults. */
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
      process.env.ASSEMBLYAI_STREAMING_MODEL ||
      DEFAULTS.streamingSpeechModel,
  };
}

/** Write settings to the cookie. Called from the API route. */
export async function saveSettings(
  settings: Partial<ModelSettings>,
): Promise<ModelSettings> {
  const current = await getSettings();
  const merged: ModelSettings = { ...current, ...settings };

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, JSON.stringify(merged), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });

  return merged;
}
