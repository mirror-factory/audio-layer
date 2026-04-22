/**
 * Embed a completed meeting -- chunks transcript + summary + intake,
 * generates vectors, and stores in meeting_embeddings.
 */

import { getSupabaseServer } from "@/lib/supabase/server";
import { getMeetingsStore } from "@/lib/meetings/store";
import { embedText, EMBEDDING_MODEL } from "./client";
import { chunkText, estimateTokenCount } from "./chunk";
import { estimateEmbeddingCost } from "@/lib/billing/llm-pricing";
import { log } from "@/lib/logger";

export interface EmbedResult {
  chunksEmbedded: number;
  totalTokens: number;
  costUsd: number;
}

interface ChunkRecord {
  text: string;
  type: "transcript" | "summary" | "intake";
  index: number;
}

/**
 * Embed all textual content from a meeting and store vectors
 * in the meeting_embeddings table.
 *
 * Safe to call multiple times -- deletes previous embeddings first.
 */
export async function embedMeeting(
  meetingId: string,
  userId: string,
): Promise<EmbedResult> {
  const supabase = getSupabaseServer();
  if (!supabase) {
    log.warn("embed-meeting.skip", { reason: "supabase not configured", meetingId });
    return { chunksEmbedded: 0, totalTokens: 0, costUsd: 0 };
  }

  const store = await getMeetingsStore();
  const meeting = await store.get(meetingId);
  if (!meeting) {
    log.warn("embed-meeting.skip", { reason: "meeting not found", meetingId });
    return { chunksEmbedded: 0, totalTokens: 0, costUsd: 0 };
  }

  // Collect all chunks across content types
  const allChunks: ChunkRecord[] = [];

  if (meeting.text) {
    const transcriptChunks = chunkText(meeting.text);
    transcriptChunks.forEach((text, index) => {
      allChunks.push({ text, type: "transcript", index });
    });
  }

  if (meeting.summary) {
    const summaryText = [
      meeting.summary.title,
      meeting.summary.summary,
      ...(meeting.summary.keyPoints ?? []),
      ...(meeting.summary.decisions ?? []),
    ]
      .filter(Boolean)
      .join("\n\n");

    if (summaryText.trim()) {
      const summaryChunks = chunkText(summaryText);
      summaryChunks.forEach((text, index) => {
        allChunks.push({ text, type: "summary", index });
      });
    }
  }

  if (meeting.intakeForm) {
    const intakeText = JSON.stringify(meeting.intakeForm, null, 2);
    if (intakeText.trim()) {
      const intakeChunks = chunkText(intakeText);
      intakeChunks.forEach((text, index) => {
        allChunks.push({ text, type: "intake", index });
      });
    }
  }

  if (allChunks.length === 0) {
    log.info("embed-meeting.skip", { reason: "no text content", meetingId });
    return { chunksEmbedded: 0, totalTokens: 0, costUsd: 0 };
  }

  // Delete existing embeddings for this meeting
  await supabase
    .from("meeting_embeddings")
    .delete()
    .eq("meeting_id", meetingId);

  // Embed all chunks
  let totalTokens = 0;
  const rows: Array<{
    meeting_id: string;
    user_id: string;
    chunk_index: number;
    chunk_text: string;
    chunk_type: string;
    embedding: string;
    token_count: number;
  }> = [];

  for (const chunk of allChunks) {
    const tokenCount = estimateTokenCount(chunk.text);
    totalTokens += tokenCount;

    const vector = await embedText(chunk.text);

    rows.push({
      meeting_id: meetingId,
      user_id: userId,
      chunk_index: chunk.index,
      chunk_text: chunk.text,
      chunk_type: chunk.type,
      embedding: JSON.stringify(vector),
      token_count: tokenCount,
    });
  }

  // Batch insert
  const { error } = await supabase.from("meeting_embeddings").insert(rows);

  if (error) {
    log.error("embed-meeting.insert-failed", {
      meetingId,
      error: error.message,
    });
    throw new Error(`Failed to insert embeddings: ${error.message}`);
  }

  const costUsd = estimateEmbeddingCost(totalTokens);

  log.info("embed-meeting.done", {
    meetingId,
    chunksEmbedded: rows.length,
    totalTokens,
    costUsd,
  });

  return {
    chunksEmbedded: rows.length,
    totalTokens,
    costUsd,
  };
}
