import { describe, expect, it } from "vitest";
import {
  extractDeepgramTranscriptText,
  parseDeepgramLiveResultEvent,
} from "@/lib/deepgram/live-results";

describe("Deepgram live result parsing", () => {
  it("extracts interim text from Listen v1 Results events", () => {
    const event = {
      type: "Results",
      is_final: false,
      channel: {
        alternatives: [
          {
            transcript: "hello from the live call",
            confidence: 0.91,
            words: [],
          },
        ],
      },
    };

    expect(extractDeepgramTranscriptText(event)).toBe("hello from the live call");
    expect(parseDeepgramLiveResultEvent(event)).toEqual({
      kind: "partial",
      text: "hello from the live call",
    });
  });

  it("converts final Listen v1 Results into a UI turn", () => {
    const event = {
      type: "Results",
      is_final: true,
      start: 1.2,
      duration: 1.1,
      channel: {
        alternatives: [
          {
            transcript: "Budget was approved.",
            confidence: 0.94,
            words: [
              { word: "Budget", start: 1.2, end: 1.6, confidence: 0.93, speaker: 0 },
              { word: "approved", start: 1.7, end: 2.3, confidence: 0.95, speaker: 0 },
            ],
          },
        ],
      },
    };

    expect(parseDeepgramLiveResultEvent(event)).toEqual({
      kind: "final",
      turn: {
        speaker: "Speaker 1",
        text: "Budget was approved.",
        start: 1200,
        end: 2300,
        confidence: 0.94,
        final: true,
      },
    });
  });

  it("parses Flux Listen v2 turn updates and final turns", () => {
    expect(
      parseDeepgramLiveResultEvent({
        type: "TurnInfo",
        event: "Update",
        transcript: "we should prepare",
        audio_window_start: 0,
        audio_window_end: 0.8,
        words: [{ word: "prepare", confidence: 0.88 }],
      }),
    ).toEqual({ kind: "partial", text: "we should prepare" });

    expect(
      parseDeepgramLiveResultEvent({
        type: "TurnInfo",
        event: "EndOfTurn",
        transcript: "We should prepare the launch notes.",
        audio_window_start: 0,
        audio_window_end: 2.4,
        words: [{ word: "We", confidence: 0.9 }],
      }),
    ).toEqual({
      kind: "final",
      turn: {
        speaker: null,
        text: "We should prepare the launch notes.",
        start: 0,
        end: 2400,
        confidence: 0.9,
        final: true,
      },
    });
  });
});
