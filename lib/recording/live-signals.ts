export type LiveNotesMode =
  | "transcript"
  | "keyPoints"
  | "actions"
  | "decisions"
  | "questions";

export interface LiveSignalTurn {
  text: string;
  start: number;
}

export interface LiveMeetingSignal {
  id: string;
  text: string;
  timestamp: string | null;
  source: "final" | "live";
}

export interface LiveMeetingSignals {
  keyPoints: LiveMeetingSignal[];
  actions: LiveMeetingSignal[];
  decisions: LiveMeetingSignal[];
  questions: LiveMeetingSignal[];
  latestLine: string | null;
  words: number;
}

export function deriveLiveMeetingSignals(
  turns: LiveSignalTurn[],
  partial: string,
): LiveMeetingSignals {
  const candidates = [
    ...turns.flatMap((turn, turnIndex) =>
      splitSignalSentences(turn.text).map((text, sentenceIndex) => ({
        id: `${turnIndex}-${sentenceIndex}`,
        text,
        timestamp: formatSignalTimestamp(turn.start),
        source: "final" as const,
        index: turnIndex * 10 + sentenceIndex,
      })),
    ),
    ...splitSignalSentences(partial).map((text, sentenceIndex) => ({
      id: `live-${sentenceIndex}`,
      text,
      timestamp: null,
      source: "live" as const,
      index: turns.length * 10 + sentenceIndex,
    })),
  ];

  const allText = [...turns.map((turn) => turn.text), partial]
    .join(" ")
    .trim();
  const latestLine =
    partial.trim() ||
    [...turns].reverse().find((turn) => turn.text.trim())?.text.trim() ||
    null;

  return {
    keyPoints: selectSignals(
      candidates.filter((item) => isKeyPoint(item.text)),
      5,
    ),
    actions: selectSignals(
      candidates.filter((item) => isActionSignal(item.text)),
      5,
    ),
    decisions: selectSignals(
      candidates.filter((item) => isDecisionSignal(item.text)),
      5,
    ),
    questions: selectSignals(
      candidates.filter((item) => isQuestionSignal(item.text)),
      5,
    ),
    latestLine: latestLine ? truncateSignalText(latestLine, 140) : null,
    words: allText ? allText.split(/\s+/).filter(Boolean).length : 0,
  };
}

function splitSignalSentences(text: string): string[] {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (!normalized) return [];

  const sentences = normalized.match(/[^.!?]+[.!?]?/g) ?? [normalized];
  return sentences
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.length >= 3)
    .map((sentence) => truncateSignalText(sentence, 160));
}

function selectSignals(
  candidates: Array<LiveMeetingSignal & { index: number }>,
  limit: number,
): LiveMeetingSignal[] {
  const seen = new Set<string>();
  return [...candidates]
    .sort((a, b) => b.index - a.index)
    .filter((item) => {
      const key = item.text.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, limit)
    .map(({ id, text, timestamp, source }) => ({ id, text, timestamp, source }));
}

function isKeyPoint(text: string): boolean {
  const normalized = text.toLowerCase();
  if (normalized.length < 32) return false;
  if (isQuestionSignal(text) || isActionSignal(text) || isDecisionSignal(text)) {
    return false;
  }

  return (
    /\b(because|important|goal|problem|risk|customer|timeline|budget|strategy|need|context|priority|plan)\b/i.test(
      normalized,
    ) || normalized.split(/\s+/).length >= 9
  );
}

function isActionSignal(text: string): boolean {
  return /\b(action|next step|follow up|follow-up|todo|to do|need to|we need|let's|please|send|schedule|create|review|share|update|assign|prepare)\b/i.test(
    text,
  );
}

function isDecisionSignal(text: string): boolean {
  return /\b(decided|decision|agreed|approved|confirmed|we will|we'll|going with|locked|final|choose|chosen)\b/i.test(
    text,
  );
}

function isQuestionSignal(text: string): boolean {
  return (
    text.includes("?") ||
    /^(what|why|how|when|who|where|can|could|should|would|do|does|did|is|are|will)\b/i.test(
      text.trim(),
    )
  );
}

function truncateSignalText(text: string, maxLength: number): string {
  const normalized = text.replace(/\s+/g, " ").trim();
  if (normalized.length <= maxLength) return normalized;
  return `${normalized.slice(0, maxLength - 1).trim()}…`;
}

function formatSignalTimestamp(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(totalSec / 60);
  const seconds = totalSec % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}
