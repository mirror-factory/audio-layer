import { describe, expect, it } from "vitest";
import {
  buildRecordingVoiceDirective,
  formatRecordingVoiceDirectivesForPrompt,
  parseRecordingVoiceCommand,
} from "@/lib/recording/voice-commands";

describe("recording voice commands", () => {
  it("recognizes a remove-last command after the wake phrase", () => {
    expect(parseRecordingVoiceCommand("Hey Layers remove that last thing")).toMatchObject({
      type: "remove_last",
      instruction: "remove that last thing",
    });
  });

  it("recognizes layer one and scratch-that phrasing", () => {
    expect(parseRecordingVoiceCommand("Okay Layer One scratch that")).toMatchObject({
      type: "remove_last",
      instruction: "scratch that",
    });
  });

  it("recognizes action-plan directives", () => {
    expect(parseRecordingVoiceCommand("Hey Layers make that an action item")).toMatchObject({
      type: "mark_action",
      instruction: "make that an action item",
    });
  });

  it("keeps custom instructions after the wake phrase for final note analysis", () => {
    expect(
      parseRecordingVoiceCommand("Hey Layers remember that this is a customer risk"),
    ).toMatchObject({
      type: "note_instruction",
      instruction: "remember that this is a customer risk",
    });
  });

  it("ignores normal transcript speech", () => {
    expect(parseRecordingVoiceCommand("The layer one design needs more polish")).toBeNull();
  });

  it("formats non-destructive directives for summarization prompts", () => {
    const command = parseRecordingVoiceCommand("Hey Layers add that as a follow up");
    expect(command).not.toBeNull();

    const directive = buildRecordingVoiceDirective(
      command!,
      "Send the updated proposal by Friday.",
      92.4,
    );

    expect(formatRecordingVoiceDirectivesForPrompt([directive!])).toContain(
      "Target transcript segment: \"Send the updated proposal by Friday.\"",
    );
  });
});
