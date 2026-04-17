/**
 * Supabase-backed MeetingsStore.
 *
 * Active when SUPABASE_URL + SUPABASE_ANON_KEY are set. Bound to the
 * current user via `userId` — RLS handles SELECT/UPDATE/DELETE
 * filtering, while insert() explicitly stamps `user_id` so the
 * INSERT WITH CHECK policy passes.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { MeetingSummary } from "@/lib/assemblyai/schema";
import type { TranscribeUtterance } from "@/lib/assemblyai/types";
import type {
  Meeting,
  MeetingInsert,
  MeetingListItem,
  MeetingUpdate,
} from "./types";
import type { MeetingsStore } from "./store";

const TABLE = "meetings";

interface MeetingRow {
  id: string;
  user_id: string | null;
  status: string;
  title: string | null;
  text: string | null;
  utterances: TranscribeUtterance[] | null;
  duration_seconds: number | null;
  summary: MeetingSummary | null;
  error: string | null;
  created_at: string;
  updated_at: string;
}

function fromRow(row: MeetingRow): Meeting {
  return {
    id: row.id,
    status: row.status as Meeting["status"],
    title: row.title,
    text: row.text,
    utterances: row.utterances ?? [],
    durationSeconds: row.duration_seconds,
    summary: row.summary,
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseMeetingsStore implements MeetingsStore {
  constructor(
    private readonly client: SupabaseClient,
    private readonly userId: string,
  ) {}

  async insert(row: MeetingInsert): Promise<Meeting> {
    const { data, error } = await this.client
      .from(TABLE)
      .insert({
        id: row.id,
        user_id: this.userId,
        status: row.status ?? "processing",
        title: row.title ?? null,
      })
      .select("*")
      .single<MeetingRow>();
    if (error) throw new Error(`Supabase insert failed: ${error.message}`);
    return fromRow(data);
  }

  async update(id: string, patch: MeetingUpdate): Promise<Meeting | null> {
    const payload: Record<string, unknown> = {};
    if (patch.status !== undefined) payload.status = patch.status;
    if (patch.title !== undefined) payload.title = patch.title;
    if (patch.text !== undefined) payload.text = patch.text;
    if (patch.utterances !== undefined) payload.utterances = patch.utterances;
    if (patch.durationSeconds !== undefined)
      payload.duration_seconds = patch.durationSeconds;
    if (patch.summary !== undefined) payload.summary = patch.summary;
    if (patch.error !== undefined) payload.error = patch.error;

    const { data, error } = await this.client
      .from(TABLE)
      .update(payload)
      .eq("id", id)
      .select("*")
      .maybeSingle<MeetingRow>();
    if (error) throw new Error(`Supabase update failed: ${error.message}`);
    return data ? fromRow(data) : null;
  }

  async get(id: string): Promise<Meeting | null> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("*")
      .eq("id", id)
      .maybeSingle<MeetingRow>();
    if (error) throw new Error(`Supabase get failed: ${error.message}`);
    return data ? fromRow(data) : null;
  }

  async list(limit: number): Promise<MeetingListItem[]> {
    const { data, error } = await this.client
      .from(TABLE)
      .select("id,status,title,duration_seconds,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(`Supabase list failed: ${error.message}`);
    return (data ?? []).map((r) => ({
      id: r.id as string,
      status: r.status as Meeting["status"],
      title: r.title as string | null,
      durationSeconds: r.duration_seconds as number | null,
      createdAt: r.created_at as string,
    }));
  }
}
