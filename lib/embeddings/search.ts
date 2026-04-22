/**
 * Semantic search across meeting embeddings.
 * Uses cosine similarity to find relevant meeting chunks.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { embedText } from "./client";
import { log } from "@/lib/logger";

export interface SearchResult {
  meetingId: string;
  chunkText: string;
  chunkType: string;
  similarity: number;
  meetingTitle: string | null;
  meetingDate: string;
}

const DEFAULT_LIMIT = 10;
const SIMILARITY_THRESHOLD = 0.5;

/**
 * Search meetings by semantic similarity.
 *
 * Embeds the query, then runs a cosine similarity search against
 * the meeting_embeddings table, scoped to the given user.
 */
export async function searchMeetings(
  query: string,
  userId: string,
  limit = DEFAULT_LIMIT,
): Promise<SearchResult[]> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    log.warn("search-meetings.skip", { reason: "supabase not configured" });
    return [];
  }

  const queryEmbedding = await embedText(query);

  // Use RPC if the function exists, otherwise fall back to direct query.
  // The RPC approach is more efficient with pgvector indexes.
  const { data, error } = await supabase.rpc("match_meeting_embeddings", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: limit,
    p_user_id: userId,
  });

  if (error) {
    // Fallback: the RPC function may not be deployed yet.
    // Log and return empty rather than crashing.
    log.warn("search-meetings.rpc-failed", {
      error: error.message,
      hint: "Run the match_meeting_embeddings function migration",
    });
    return [];
  }

  return ((data as SearchRow[]) ?? []).map((row) => ({
    meetingId: row.meeting_id,
    chunkText: row.chunk_text,
    chunkType: row.chunk_type,
    similarity: row.similarity,
    meetingTitle: row.meeting_title ?? null,
    meetingDate: row.meeting_date,
  }));
}

interface SearchRow {
  meeting_id: string;
  chunk_text: string;
  chunk_type: string;
  similarity: number;
  meeting_title: string | null;
  meeting_date: string;
}
