/**
 * AI SDK v6 tool definitions for the chat route.
 * Uses inputSchema (not parameters) per AI SDK v6 conventions.
 */

import { z } from "zod";
import { tool } from "ai";
import { searchMeetings } from "@/lib/embeddings/search";
import { getMeetingsStore } from "@/lib/meetings/store";
import { getCurrentUserId } from "@/lib/supabase/user";

export const allTools = {
  searchMeetings: tool({
    description:
      "Search across all of the user's meeting transcripts, summaries, and intake forms using semantic search. Use this when the user asks about past meetings, wants to find specific discussions, or asks questions that could be answered by meeting content.",
    inputSchema: z.object({
      query: z.string().describe("The search query — what to look for across meetings"),
      limit: z.number().min(1).max(20).optional().describe("Max results to return (default 5)"),
    }),
    execute: async ({ query, limit }) => {
      const userId = await getCurrentUserId();
      if (!userId) {
        return { results: [], error: "Not authenticated" };
      }

      const results = await searchMeetings(query, userId, limit ?? 5);

      if (results.length === 0) {
        return { results: [], message: `No meetings found matching "${query}".` };
      }

      return {
        results: results.map((r) => ({
          meetingId: r.meetingId,
          title: r.meetingTitle ?? "Untitled",
          date: r.meetingDate,
          relevance: Math.round(r.similarity * 100),
          excerpt: r.chunkText.substring(0, 300),
          type: r.chunkType,
        })),
      };
    },
  }),

  getMeetingDetails: tool({
    description:
      "Get the full details of a specific meeting including transcript, summary, key points, action items, and decisions. Use this after searching to get deeper context on a specific meeting.",
    inputSchema: z.object({
      meetingId: z.string().describe("The meeting ID to retrieve"),
    }),
    execute: async ({ meetingId }) => {
      const store = await getMeetingsStore();
      const meeting = await store.get(meetingId);

      if (!meeting) {
        return { error: "Meeting not found" };
      }

      return {
        id: meeting.id,
        title: meeting.title ?? "Untitled",
        date: meeting.createdAt,
        duration: meeting.durationSeconds
          ? `${Math.round(meeting.durationSeconds / 60)} minutes`
          : null,
        status: meeting.status,
        transcript: meeting.utterances
          .map((u) => u.text)
          .join(" ")
          .substring(0, 2000),
        summary: meeting.summary?.summary ?? null,
        keyPoints: meeting.summary?.keyPoints ?? [],
        actionItems: meeting.summary?.actionItems ?? [],
        decisions: meeting.summary?.decisions ?? [],
        participants: meeting.summary?.participants ?? [],
      };
    },
  }),

  listRecentMeetings: tool({
    description:
      "List recent meetings with their titles, dates, and statuses. Use this when the user wants to see what meetings they have.",
    inputSchema: z.object({
      limit: z.number().min(1).max(50).optional().describe("Max meetings to return (default 10)"),
    }),
    execute: async ({ limit }) => {
      const store = await getMeetingsStore();
      const meetings = await store.list(limit ?? 10);

      return {
        meetings: meetings.map((m) => ({
          id: m.id,
          title: m.title ?? "Untitled",
          date: m.createdAt,
          duration: m.durationSeconds
            ? `${Math.round(m.durationSeconds / 60)} min`
            : null,
          status: m.status,
        })),
      };
    },
  }),
};
