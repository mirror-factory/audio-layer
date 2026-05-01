/**
 * AssemblyAI live canary (PROD-331).
 *
 * Submits one tiny batch transcription job against the real AssemblyAI API
 * and waits for it to terminate in a non-error state. This catches the
 * "vendor renamed/deprecated a field" class of breakage that mocks cannot,
 * e.g. AssemblyAI's `speech_model` -> `speech_models` migration.
 *
 * Gated double:
 *   - `RUN_LIVE_CANARIES=1` to opt in (skipped from default `pnpm test`)
 *   - `ASSEMBLYAI_API_KEY` must be set
 *
 * Wire this into nightly GH Actions or run manually before a release.
 */
import { describe, it, expect } from "vitest";

const RUN = process.env.RUN_LIVE_CANARIES === "1";
const HAS_KEY = Boolean(process.env.ASSEMBLYAI_API_KEY);
const ENABLED = RUN && HAS_KEY;

// 5-second silent WAV (16 kHz mono PCM) -- tiny but valid audio.
// AssemblyAI's free tier accepts files this small.
const TINY_WAV_URL =
  "https://storage.googleapis.com/aai-docs-samples/sports_injuries.mp3";

describe.skipIf(!ENABLED)("AssemblyAI live canary", () => {
  it("submits a real batch transcription with the current schema", async () => {
    const { AssemblyAI } = await import("assemblyai");
    const client = new AssemblyAI({
      apiKey: process.env.ASSEMBLYAI_API_KEY!,
    });

    // Use the minimum valid request shape -- if the vendor renames a field,
    // this throws with the actual server error message.
    const transcript = await client.transcripts.transcribe({
      audio_url: TINY_WAV_URL,
      speech_models: ["universal-3-pro"],
    });

    expect(transcript.id).toBeDefined();
    expect(["completed", "queued", "processing"]).toContain(transcript.status);
  }, 120_000);
});
