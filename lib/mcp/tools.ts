/**
 * MCP tool definitions for Layer One Audio.
 *
 * Each tool is defined with a Zod schema for inputs and a handler function
 * that receives the validated input + userId context.
 */

import { z } from "zod";
import { getMeetingsStore } from "@/lib/meetings/store";
import { searchMeetings } from "@/lib/embeddings/search";
import type { Meeting, MeetingListItem } from "@/lib/meetings/types";
import type { SearchResult } from "@/lib/embeddings/search";

// ---------------------------------------------------------------------------
// Tool schemas
// ---------------------------------------------------------------------------

export const SearchMeetingsSchema = z.object({
  query: z.string().describe("Natural language search query"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .describe("Max results (default 10)"),
});

export const GetMeetingSchema = z.object({
  meeting_id: z.string().describe("The meeting ID"),
});

export const ListMeetingsSchema = z.object({
  limit: z
    .number()
    .int()
    .min(1)
    .max(100)
    .optional()
    .describe("Max meetings to return (default 20)"),
});

export const GetTranscriptSchema = z.object({
  meeting_id: z.string().describe("The meeting ID"),
});

export const GetSummarySchema = z.object({
  meeting_id: z.string().describe("The meeting ID"),
});

export const StartRecordingSchema = z.object({});

// ---------------------------------------------------------------------------
// Tool handlers
// ---------------------------------------------------------------------------

export async function handleSearchMeetings(
  input: z.infer<typeof SearchMeetingsSchema>,
  userId: string,
): Promise<SearchResult[]> {
  return searchMeetings(input.query, userId, input.limit);
}

export async function handleGetMeeting(
  input: z.infer<typeof GetMeetingSchema>,
  userId: string,
): Promise<Meeting | null> {
  void userId; // RLS enforced at store level
  const store = await getMeetingsStore();
  return store.get(input.meeting_id);
}

export async function handleListMeetings(
  input: z.infer<typeof ListMeetingsSchema>,
  userId: string,
): Promise<MeetingListItem[]> {
  void userId;
  const store = await getMeetingsStore();
  return store.list(input.limit ?? 20);
}

export async function handleGetTranscript(
  input: z.infer<typeof GetTranscriptSchema>,
  userId: string,
): Promise<string> {
  void userId;
  const store = await getMeetingsStore();
  const meeting = await store.get(input.meeting_id);
  return meeting?.text ?? "";
}

export async function handleGetSummary(
  input: z.infer<typeof GetSummarySchema>,
  userId: string,
): Promise<Record<string, unknown> | null> {
  void userId;
  const store = await getMeetingsStore();
  const meeting = await store.get(input.meeting_id);
  if (!meeting?.summary) return null;
  return meeting.summary as unknown as Record<string, unknown>;
}

export async function handleStartRecording(
  _input: z.infer<typeof StartRecordingSchema>,
  _userId: string,
): Promise<{ message: string }> {
  // Placeholder -- actual implementation would create a new recording session
  return {
    message:
      "Recording must be started from the app UI. Navigate to /record/live in the Layer One Audio app.",
  };
}

// ---------------------------------------------------------------------------
// Tool registry
// ---------------------------------------------------------------------------

export interface McpToolDef {
  name: string;
  description: string;
  schema: z.ZodType;
  handler: (input: unknown, userId: string) => Promise<unknown>;
}

export const MCP_TOOLS: McpToolDef[] = [
  {
    name: "search_meetings",
    description:
      "Search through meeting transcripts, summaries, and intake forms using natural language. Returns ranked results by semantic similarity.",
    schema: SearchMeetingsSchema,
    handler: (input, userId) =>
      handleSearchMeetings(
        input as z.infer<typeof SearchMeetingsSchema>,
        userId,
      ),
  },
  {
    name: "get_meeting",
    description:
      "Get full details of a specific meeting including transcript, summary, intake form, and cost breakdown.",
    schema: GetMeetingSchema,
    handler: (input, userId) =>
      handleGetMeeting(input as z.infer<typeof GetMeetingSchema>, userId),
  },
  {
    name: "list_meetings",
    description:
      "List recent meetings with their status, title, and duration.",
    schema: ListMeetingsSchema,
    handler: (input, userId) =>
      handleListMeetings(input as z.infer<typeof ListMeetingsSchema>, userId),
  },
  {
    name: "get_transcript",
    description: "Get the full transcript text of a meeting.",
    schema: GetTranscriptSchema,
    handler: (input, userId) =>
      handleGetTranscript(
        input as z.infer<typeof GetTranscriptSchema>,
        userId,
      ),
  },
  {
    name: "get_summary",
    description:
      "Get the AI-generated summary of a meeting including title, key points, action items, and decisions.",
    schema: GetSummarySchema,
    handler: (input, userId) =>
      handleGetSummary(input as z.infer<typeof GetSummarySchema>, userId),
  },
  {
    name: "start_recording",
    description:
      "Start a new audio recording session. Note: recording must be initiated from the app UI.",
    schema: StartRecordingSchema,
    handler: (input, userId) =>
      handleStartRecording(
        input as z.infer<typeof StartRecordingSchema>,
        userId,
      ),
  },
];
