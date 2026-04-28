import { describe, expect, it } from "vitest";
import {
  microphoneUnsupportedMessage,
  recordingStartErrorMessage,
} from "@/lib/recording/microphone-errors";

describe("recordingStartErrorMessage", () => {
  it("turns browser permission denials into actionable copy", () => {
    const message = recordingStartErrorMessage(
      new DOMException("Permission denied", "NotAllowedError"),
    );

    expect(message).toContain("Microphone access is blocked");
    expect(message).toContain("localhost:3001");
    expect(message).toContain("Codex in-app browser");
  });

  it("explains missing microphones", () => {
    const message = recordingStartErrorMessage(
      new DOMException("No device", "NotFoundError"),
    );

    expect(message).toBe("No microphone was found. Connect a microphone and try again.");
  });

  it("explains busy microphones", () => {
    const message = recordingStartErrorMessage(
      new DOMException("Already in use", "NotReadableError"),
    );

    expect(message).toBe(
      "The microphone is already in use by another app. Close the other app and try again.",
    );
  });

  it("keeps provider/backend startup errors intact", () => {
    expect(recordingStartErrorMessage(new Error("Token request failed (503)"))).toBe(
      "Token request failed (503)",
    );
  });

  it("explains unsupported embedded browsers", () => {
    expect(microphoneUnsupportedMessage()).toContain("does not expose microphone recording");
  });
});
