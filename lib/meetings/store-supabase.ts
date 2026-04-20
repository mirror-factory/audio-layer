/**
 * Supabase-backed MeetingsStore with RLS.
 * Uses the per-request user-scoped client. Stamps user_id on insert.
 */

import { getSupabaseUser, getCurrentUserId } from "@/lib/supabase/user";
import type {
  Meeting,
  MeetingInsert,
  MeetingListItem,
  MeetingUpdate,
} from "./types";
import type { MeetingsStore } from "./store";

// ---------------------------------------------------------------------------
// snake_case <-> camelCase mapping
// ---------------------------------------------------------------------------

interface SupabaseRow {
  id: string;
  user_id: string | null;
  status: string;
  title: string | null;
  text: string | null;
  utterances: unknown;
  duration_seconds: number | null;
  summary: unknown;
  intake_form: unknown;
  cost_breakdown: unknown;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function rowToMeeting(row: SupabaseRow): Meeting {
  return {
    id: row.id,
    status: row.status as Meeting["status"],
    title: row.title,
    text: row.text,
    utterances: (row.utterances as Meeting["utterances"]) ?? [],
    durationSeconds: row.duration_seconds,
    summary: (row.summary as Meeting["summary"]) ?? null,
    intakeForm: (row.intake_form as Meeting["intakeForm"]) ?? null,
    costBreakdown:
      (row.cost_breakdown as Meeting["costBreakdown"]) ?? null,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function updateToSnake(
  patch: MeetingUpdate,
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  if (patch.status !== undefined) out.status = patch.status;
  if (patch.title !== undefined) out.title = patch.title;
  if (patch.text !== undefined) out.text = patch.text;
  if (patch.utterances !== undefined) out.utterances = patch.utterances;
  if (patch.durationSeconds !== undefined)
    out.duration_seconds = patch.durationSeconds;
  if (patch.summary !== undefined) out.summary = patch.summary;
  if (patch.intakeForm !== undefined) out.intake_form = patch.intakeForm;
  if (patch.costBreakdown !== undefined)
    out.cost_breakdown = patch.costBreakdown;
  if (patch.error !== undefined) out.error = patch.error;
  return out;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export class SupabaseMeetingsStore implements MeetingsStore {
  async insert(row: MeetingInsert): Promise<Meeting> {
    const supabase = await getSupabaseUser();
    if (!supabase) throw new Error("Supabase not configured");

    const userId = await getCurrentUserId();

    const { data, error } = await supabase
      .from("meetings")
      .insert({
        id: row.id,
        user_id: userId,
        status: row.status ?? "processing",
        title: row.title ?? null,
      })
      .select()
      .single();

    if (error) throw new Error(`Insert failed: ${error.message}`);
    return rowToMeeting(data as SupabaseRow);
  }

  async update(
    id: string,
    patch: MeetingUpdate,
  ): Promise<Meeting | null> {
    const supabase = await getSupabaseUser();
    if (!supabase) return null;

    const snakePatch = updateToSnake(patch);
    if (Object.keys(snakePatch).length === 0) return this.get(id);

    const { data, error } = await supabase
      .from("meetings")
      .update(snakePatch)
      .eq("id", id)
      .select()
      .single();

    if (error) {
      console.warn(`[meetings] Update failed for ${id}:`, error.message);
      return null;
    }
    return rowToMeeting(data as SupabaseRow);
  }

  async get(id: string): Promise<Meeting | null> {
    const supabase = await getSupabaseUser();
    if (!supabase) return null;

    const { data, error } = await supabase
      .from("meetings")
      .select()
      .eq("id", id)
      .single();

    if (error || !data) return null;
    return rowToMeeting(data as SupabaseRow);
  }

  async list(limit: number): Promise<MeetingListItem[]> {
    const supabase = await getSupabaseUser();
    if (!supabase) return [];

    const { data, error } = await supabase
      .from("meetings")
      .select("id, status, title, duration_seconds, created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error || !data) return [];

    return data.map(
      (
        row: Pick<
          SupabaseRow,
          "id" | "status" | "title" | "duration_seconds" | "created_at"
        >,
      ) => ({
        id: row.id,
        status: row.status as MeetingListItem["status"],
        title: row.title,
        durationSeconds: row.duration_seconds,
        createdAt: row.created_at,
      }),
    );
  }
}
