/**
 * Hybrid search across meeting embeddings.
 *
 * Combines vector similarity (semantic) + BM25 full-text (keyword)
 * using Reciprocal Rank Fusion for best-of-both results.
 *
 * Falls back to pure vector search if the hybrid RPC isn't deployed.
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
 * Search meetings using hybrid vector + full-text search.
 *
 * 1. Embeds the query via AI Gateway
 * 2. Calls hybrid_search_meetings RPC (vector + BM25 + RRF)
 * 3. Falls back to pure vector search if hybrid RPC unavailable
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

  // Try hybrid search first (vector + BM25 + RRF)
  const { data: hybridData, error: hybridError } = await supabase.rpc(
    "hybrid_search_meetings",
    {
      query_text: query,
      query_embedding: JSON.stringify(queryEmbedding),
      match_count: limit,
      p_user_id: userId,
      vector_weight: 0.7,
    },
  );

  if (!hybridError && hybridData) {
    return (hybridData as SearchRow[]).map(mapRow);
  }

  // Fallback to pure vector search
  log.info("search-meetings.fallback-to-vector", {
    reason: hybridError?.message ?? "hybrid not available",
  });

  const { data, error } = await supabase.rpc("match_meeting_embeddings", {
    query_embedding: JSON.stringify(queryEmbedding),
    match_threshold: SIMILARITY_THRESHOLD,
    match_count: limit,
    p_user_id: userId,
  });

  if (error) {
    log.warn("search-meetings.rpc-failed", {
      error: error.message,
      hint: "Run lib/supabase/embeddings-schema.sql",
    });
    return [];
  }

  return ((data as SearchRow[]) ?? []).map(mapRow);
}

interface SearchRow {
  meeting_id: string;
  chunk_text: string;
  chunk_type: string;
  similarity: number;
  meeting_title: string | null;
  meeting_date: string;
}

function mapRow(row: SearchRow): SearchResult {
  return {
    meetingId: row.meeting_id,
    chunkText: row.chunk_text,
    chunkType: row.chunk_type,
    similarity: row.similarity,
    meetingTitle: row.meeting_title ?? null,
    meetingDate: row.meeting_date,
  };
}
