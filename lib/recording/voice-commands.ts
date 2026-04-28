export type RecordingVoiceCommandType =
  | "remove_last"
  | "mark_action"
  | "note_instruction";

export interface RecordingVoiceCommand {
  type: RecordingVoiceCommandType;
  rawText: string;
  instruction: string;
}

export interface RecordingVoiceDirective {
  type: Exclude<RecordingVoiceCommandType, "remove_last">;
  instruction: string;
  targetText: string | null;
  atSeconds: number | null;
}

const WAKE_PHRASE_PATTERN =
  /^(?:hey|ok|okay)\s+(?:layer\s+one|layers?)\b[\s,.:;!?-]*(.*)$/i;

const REMOVE_LAST_PATTERN =
  /\b(?:remove|delete|erase|drop|undo|cut|take\s+out)\b.*\b(?:that|the|my|last|previous)\b|\b(?:scratch|undo)\s+that\b|\btake\s+that\s+out\b/;

const ACTION_PATTERN =
  /\b(?:action\s+item|action\s+plan|next\s+step|follow[-\s]?up|todo|to-do)\b|\b(?:make|mark|turn|add|put)\b.*\baction\b/;

function normalizeSpokenText(text: string): string {
  return text
    .trim()
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/\s+/g, " ");
}

export function parseRecordingVoiceCommand(
  text: string,
): RecordingVoiceCommand | null {
  const rawText = normalizeSpokenText(text);
  if (!rawText) return null;

  const match = rawText.match(WAKE_PHRASE_PATTERN);
  if (!match) return null;

  const instruction = normalizeSpokenText(match[1] ?? "");
  if (!instruction) return null;

  const normalizedInstruction = instruction.toLowerCase();
  if (REMOVE_LAST_PATTERN.test(normalizedInstruction)) {
    return { type: "remove_last", rawText, instruction };
  }

  if (ACTION_PATTERN.test(normalizedInstruction)) {
    return { type: "mark_action", rawText, instruction };
  }

  return { type: "note_instruction", rawText, instruction };
}

export function buildRecordingVoiceDirective(
  command: RecordingVoiceCommand,
  targetText: string | null,
  atSeconds: number | null,
): RecordingVoiceDirective | null {
  if (command.type === "remove_last") return null;

  return {
    type: command.type,
    instruction: command.instruction,
    targetText,
    atSeconds,
  };
}

export function formatRecordingVoiceDirectivesForPrompt(
  directives: RecordingVoiceDirective[] | undefined,
): string {
  if (!directives?.length) return "";

  return directives
    .slice(0, 25)
    .map((directive, index) => {
      const target = directive.targetText
        ? ` Target transcript segment: "${directive.targetText.slice(0, 500)}"`
        : " No target transcript segment was available.";
      const timestamp =
        typeof directive.atSeconds === "number"
          ? ` Around ${Math.max(0, Math.round(directive.atSeconds))}s.`
          : "";

      return `${index + 1}. ${directive.type}: ${directive.instruction}.${timestamp}${target}`;
    })
    .join("\n");
}
