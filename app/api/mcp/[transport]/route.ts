import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { searchMeetings } from "@/lib/embeddings/search";

async function queryMeetings(id?: string, limit?: number) {
  const supabase = getSupabaseServer();
  if (!supabase) return id ? null : [];

  if (id) {
    const { data } = await supabase.from("meetings").select("*").eq("id", id).single();
    return data;
  }

  const { data } = await supabase
    .from("meetings")
    .select("id, title, status, duration_seconds, created_at, user_id")
    .order("created_at", { ascending: false })
    .limit(limit ?? 20);

  return (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    title: m.title ?? "Untitled",
    status: m.status,
    duration: m.duration_seconds ? `${Math.round(Number(m.duration_seconds) / 60)} min` : null,
    date: m.created_at,
  }));
}

const handler = createMcpHandler(
  (server) => {
    server.tool(
      "search_meetings",
      "Search meeting transcripts and summaries using natural language.",
      {
        query: z.string().describe("Natural language search query"),
        limit: z.number().int().min(1).max(50).optional(),
      },
      async ({ query, limit }) => {
        // Get any user_id from the meetings table to scope the search
        const supabase = getSupabaseServer();
        let userId = "";
        if (supabase) {
          const { data } = await supabase.from("meetings").select("user_id").limit(1).single();
          userId = (data?.user_id as string) ?? "";
        }
        const results = await searchMeetings(query, userId, limit ?? 10);
        return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
      },
    );

    server.tool(
      "get_meeting",
      "Get full details of a meeting including transcript, summary, and cost.",
      { meeting_id: z.string() },
      async ({ meeting_id }) => {
        const meeting = await queryMeetings(meeting_id);
        return { content: [{ type: "text" as const, text: meeting ? JSON.stringify(meeting, null, 2) : "Meeting not found" }] };
      },
    );

    server.tool(
      "list_meetings",
      "List recent meetings with status, title, and duration.",
      { limit: z.number().int().min(1).max(100).optional() },
      async ({ limit }) => {
        const meetings = await queryMeetings(undefined, limit ?? 20);
        return { content: [{ type: "text" as const, text: JSON.stringify(meetings, null, 2) }] };
      },
    );

    server.tool(
      "get_transcript",
      "Get the full transcript text of a meeting.",
      { meeting_id: z.string() },
      async ({ meeting_id }) => {
        const meeting = await queryMeetings(meeting_id) as Record<string, unknown> | null;
        return { content: [{ type: "text" as const, text: (meeting?.text as string) ?? "No transcript available" }] };
      },
    );

    server.tool(
      "get_summary",
      "Get the AI-generated summary including key points, action items, decisions.",
      { meeting_id: z.string() },
      async ({ meeting_id }) => {
        const meeting = await queryMeetings(meeting_id) as Record<string, unknown> | null;
        return {
          content: [{ type: "text" as const, text: meeting?.summary ? JSON.stringify(meeting.summary, null, 2) : "No summary available" }],
        };
      },
    );
  },
  {
    serverInfo: { name: "layer-one-audio", version: "1.0.0" },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  },
);

export { handler as GET, handler as POST, handler as DELETE };
