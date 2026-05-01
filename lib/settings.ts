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

/**
 * Pick a settings value with the right precedence:
 *   1. Saved cookie value (explicit user choice — wins even if it's an
 *      empty string, which signals "I cleared this; use defaults" by
 *      falling through, but a NON-empty saved value is sacred).
 *   2. Env-var override (deployment-wide admin default).
 *   3. Hardcoded DEFAULTS.
 *
 * The previous implementation used short-circuit `||` which silently
 * collapsed steps 1 and 2 — so a brand-new user with no cookie always
 * picked up the env-var default, ignoring whatever was in DEFAULTS.
 * That's the PROD-395 bug.
 */
function pickValue(
  savedValue: string | undefined,
  envValue: string | undefined,
  fallback: string,
): { value: string; source: "cookie" | "env" | "default" } {
  if (typeof savedValue === "string" && savedValue.trim().length > 0) {
    return { value: savedValue, source: "cookie" };
  }
  if (typeof envValue === "string" && envValue.trim().length > 0) {
    return { value: envValue, source: "env" };
  }
  return { value: fallback, source: "default" };
}

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

  const summary = pickValue(
    saved.summaryModel,
    process.env.DEFAULT_MODEL,
    DEFAULTS.summaryModel,
  );
  const batch = pickValue(
    saved.batchSpeechModel,
    process.env.ASSEMBLYAI_BATCH_MODEL,
    DEFAULTS.batchSpeechModel,
  );
  // Streaming uses a single env-var override (any vendor's model id is
  // valid). Two separate vars (DEEPGRAM_STREAMING_MODEL +
  // ASSEMBLYAI_STREAMING_MODEL) was the original footgun — ordering
  // there made Deepgram silently win.
  const streaming = pickValue(
    saved.streamingSpeechModel,
    process.env.LAYERS_STREAMING_MODEL ??
      process.env.DEEPGRAM_STREAMING_MODEL ??
      process.env.ASSEMBLYAI_STREAMING_MODEL,
    DEFAULTS.streamingSpeechModel,
  );

  // Lightweight server log so we can grep "settings.resolved provider=
  // ... source=env" if a tester reports the wrong vendor.
  if (process.env.NODE_ENV !== "test" && streaming.source !== "cookie") {
    // eslint-disable-next-line no-console
    console.log(
      `[settings.resolved] streaming=${streaming.value} source=${streaming.source}`,
    );
  }

  return {
    summaryModel: summary.value,
    batchSpeechModel: batch.value,
    streamingSpeechModel: streaming.value,
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
