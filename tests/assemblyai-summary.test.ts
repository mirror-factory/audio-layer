/**
 * Unit tests for summary.ts helpers.
 *
 * The heavy lift (generateObject) is not exercised here — it would
 * require a live LLM. Those live runs are for the eval suite.
 * This file covers the pure functions and the empty-transcript guard.
 */

import { describe, it, expect } from "vitest";
import {
  formatTranscriptForPrompt,
  summarizeMeeting,
} from "@/lib/assemblyai/summary";

describe("formatTranscriptForPrompt", () => {
  it("joins utterances with speaker labels", () => {
    const out = formatTranscriptForPrompt([
      { speaker: "A", text: "Hello team." },
      { speaker: "B", text: "Hi." },
    ]);
    expect(out).toBe("Speaker A: Hello team.\nSpeaker B: Hi.");
  });

  it("falls back to plain Speaker when label missing", () => {
    const out = formatTranscriptForPrompt([
      { speaker: null, text: "Anonymous voice." },
    ]);
    expect(out).toBe("Speaker: Anonymous voice.");
  });

  it("returns empty string for no utterances", () => {
    expect(formatTranscriptForPrompt([])).toBe("");
  });
});

describe("summarizeMeeting empty guard", () => {
  it("returns a stub summary without calling the LLM when input is empty", async () => {
    const out = await summarizeMeeting({
      transcriptId: "tr-empty",
      utterances: [],
      fullText: "   ",
    });
    expect(out.skipped).toBe(true);
    expect(out.summary.summary).toMatch(/no speech/i);
    expect(out.summary.keyPoints).toEqual([]);
    expect(out.summary.actionItems).toEqual([]);
    expect(out.summary.decisions).toEqual([]);
    expect(out.summary.participants).toEqual([]);
    expect(out.usage).toEqual({ inputTokens: 0, outputTokens: 0 });
    expect(out.model).toBe("unknown");
  });
});
