/**
 * Meeting record — the persistent form of a transcription job.
 *
 * The id is the AssemblyAI transcript id (see lib/supabase/schema.sql).
 * utterances and summary are stored as jsonb in Supabase and as native
 * objects in the in-memory store.
 */

import type {
  TranscribeStatus,
  TranscribeUtterance,
} from "@/lib/assemblyai/types";
import type { MeetingSummary } from "@/lib/assemblyai/schema";
import type { IntakeForm } from "@/lib/assemblyai/intake";
import type { MeetingCostBreakdown } from "@/lib/billing/types";

export interface Meeting {
  id: string;
  status: TranscribeStatus;
  title: string | null;
  text: string | null;
  utterances: TranscribeUtterance[];
  durationSeconds: number | null;
  summary: MeetingSummary | null;
  intakeForm: IntakeForm | null;
  costBreakdown: MeetingCostBreakdown | null;
  error: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MeetingListItem {
  id: string;
  status: TranscribeStatus;
  title: string | null;
  durationSeconds: number | null;
  createdAt: string;
}

export interface MeetingInsert {
  id: string;
  status?: TranscribeStatus;
  title?: string | null;
}

export interface MeetingUpdate {
  status?: TranscribeStatus;
  title?: string | null;
  text?: string | null;
  utterances?: TranscribeUtterance[];
  durationSeconds?: number | null;
  summary?: MeetingSummary | null;
  intakeForm?: IntakeForm | null;
  costBreakdown?: MeetingCostBreakdown | null;
  error?: string | null;
}
