export interface DeepgramParsedTurn {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
  final: true;
}

export type DeepgramParsedLiveEvent =
  | { kind: "final"; turn: DeepgramParsedTurn }
  | { kind: "partial"; text: string }
  | { kind: "ignore" };

type JsonRecord = Record<string, unknown>;

function asRecord(value: unknown): JsonRecord | null {
  return typeof value === "object" && value !== null
    ? (value as JsonRecord)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function asNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function asArray(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function cleanTranscript(value: unknown): string {
  return (asString(value) ?? "").replace(/\s+/g, " ").trim();
}

function speakerLabel(value: unknown): string | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `Speaker ${value + 1}`;
  }
  const label = asString(value)?.trim();
  return label || null;
}

function secondsToMilliseconds(value: number): number {
  return Math.max(0, Math.round(value * 1000));
}

function firstAlternative(message: JsonRecord): JsonRecord | null {
  const channel = asRecord(message.channel);
  const alternatives = asArray(channel?.alternatives);
  return asRecord(alternatives[0]);
}

export function extractDeepgramTranscriptText(message: unknown): string {
  const record = asRecord(message);
  if (!record) return "";

  if (record.type === "Results") {
    return cleanTranscript(firstAlternative(record)?.transcript);
  }

  if (record.type === "TurnInfo") {
    return cleanTranscript(record.transcript);
  }

  return "";
}

export function parseDeepgramLiveResultEvent(
  message: unknown,
): DeepgramParsedLiveEvent {
  const record = asRecord(message);
  if (!record) return { kind: "ignore" };

  if (record.type === "Results") {
    return parseListenV1Results(record);
  }

  if (record.type === "TurnInfo") {
    return parseListenV2TurnInfo(record);
  }

  return { kind: "ignore" };
}

function parseListenV1Results(message: JsonRecord): DeepgramParsedLiveEvent {
  const alternative = firstAlternative(message);
  const text = cleanTranscript(alternative?.transcript);
  if (!text) return { kind: "ignore" };

  const isFinal =
    message.is_final === true ||
    message.speech_final === true ||
    message.from_finalize === true;
  if (!isFinal) return { kind: "partial", text };

  const words = asArray(alternative?.words).map(asRecord).filter(Boolean);
  const firstWord = words[0] ?? null;
  const lastWord = words.at(-1) ?? null;
  const startSeconds =
    asNumber(firstWord?.start) ?? asNumber(message.start) ?? 0;
  const endSeconds =
    asNumber(lastWord?.end) ??
    ((asNumber(message.start) ?? 0) + (asNumber(message.duration) ?? 0));
  const confidence =
    asNumber(alternative?.confidence) ?? asNumber(firstWord?.confidence) ?? 0;

  return {
    kind: "final",
    turn: {
      speaker: speakerLabel(firstWord?.speaker),
      text,
      start: secondsToMilliseconds(startSeconds),
      end: secondsToMilliseconds(endSeconds),
      confidence,
      final: true,
    },
  };
}

function parseListenV2TurnInfo(message: JsonRecord): DeepgramParsedLiveEvent {
  const text = cleanTranscript(message.transcript);
  if (!text) return { kind: "ignore" };

  if (message.event !== "EndOfTurn") {
    return { kind: "partial", text };
  }

  const words = asArray(message.words).map(asRecord).filter(Boolean);
  const firstWord = words[0] ?? null;

  return {
    kind: "final",
    turn: {
      speaker: null,
      text,
      start: secondsToMilliseconds(asNumber(message.audio_window_start) ?? 0),
      end: secondsToMilliseconds(asNumber(message.audio_window_end) ?? 0),
      confidence: asNumber(firstWord?.confidence) ?? 0,
      final: true,
    },
  };
}
