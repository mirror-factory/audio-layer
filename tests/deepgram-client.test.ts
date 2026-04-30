import { afterEach, describe, expect, it, vi } from "vitest";
import {
  DeepgramConfigurationError,
  getDeepgramApiKey,
  getDeepgramClient,
  requireDeepgramClient,
} from "@/lib/deepgram/client";

describe("Deepgram client diagnostics", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null when DEEPGRAM_API_KEY is missing", () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    expect(getDeepgramApiKey()).toBeNull();
    expect(getDeepgramClient()).toBeNull();
  });

  it("throws a clear missing-key error when Deepgram is required", () => {
    vi.stubEnv("DEEPGRAM_API_KEY", "");

    expect(() => requireDeepgramClient()).toThrow(DeepgramConfigurationError);
    expect(() => requireDeepgramClient()).toThrow(
      "DEEPGRAM_API_KEY is required for Deepgram transcription",
    );
  });
});
