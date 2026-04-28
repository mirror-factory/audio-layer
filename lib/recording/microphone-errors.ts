const MIC_BLOCKED_MESSAGE =
  "Microphone access is blocked. Allow microphone access for localhost:3001 in the browser, then try again. If no permission prompt appears in the Codex in-app browser, open this page in Chrome or Safari because the embedded browser may not expose microphone capture.";

function hasErrorShape(err: unknown): err is { name?: string; message?: string } {
  return typeof err === "object" && err !== null;
}

export function recordingStartErrorMessage(err: unknown): string {
  if (hasErrorShape(err)) {
    const name = err.name ?? "";
    const message = err.message ?? "";

    if (
      name === "NotAllowedError" ||
      name === "SecurityError" ||
      /permission denied|permission.*denied|notallowed/i.test(message)
    ) {
      return MIC_BLOCKED_MESSAGE;
    }

    if (name === "NotFoundError" || name === "DevicesNotFoundError") {
      return "No microphone was found. Connect a microphone and try again.";
    }

    if (name === "NotReadableError" || name === "TrackStartError") {
      return "The microphone is already in use by another app. Close the other app and try again.";
    }

    if (message) {
      return message;
    }
  }

  return "Failed to start recording";
}

export function microphoneUnsupportedMessage(): string {
  return "This browser does not expose microphone recording. Open this page in Chrome, Safari, or the native app build to test live capture.";
}
