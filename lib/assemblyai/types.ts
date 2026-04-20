import type { MeetingSummary } from "./schema";
import type { IntakeForm } from "./intake";

export type TranscribeStatus = "queued" | "processing" | "completed" | "error";

export interface TranscribeStartResponse {
  id: string;
  status: TranscribeStatus;
}

export interface TranscribeUtterance {
  speaker: string | null;
  text: string;
  start: number;
  end: number;
  confidence: number;
}

export interface TranscribeResultResponse {
  id: string;
  status: TranscribeStatus;
  /** Present when status === 'completed' */
  text?: string;
  utterances?: TranscribeUtterance[];
  durationSeconds?: number;
  summary?: MeetingSummary;
  intakeForm?: IntakeForm;
  /** Present when status === 'error' */
  error?: string;
}
