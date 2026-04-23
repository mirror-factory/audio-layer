import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { searchMeetings } from "@/lib/embeddings/search";

// ---------------------------------------------------------------------------
// Auth: validate Bearer token against profiles.api_key
// ---------------------------------------------------------------------------

let authenticatedUserId: string | null = null;

async function authenticateRequest(req: Request): Promise<Response | null> {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Add your API key from the Layer One profile page as: Authorization: Bearer YOUR_KEY" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const key = auth.slice(7);
  const supabase = getSupabaseServer();
  if (!supabase) {
    authenticatedUserId = null;
    return null; // no DB = skip auth
  }

  const { data } = await supabase
    .from("profiles")
    .select("user_id")
    .eq("api_key", key)
    .single();

  if (!data) {
    return new Response(JSON.stringify({ error: "Invalid API key" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  authenticatedUserId = data.user_id as string;
  return null; // auth passed
}

// ---------------------------------------------------------------------------
// Helpers: query meetings scoped to authenticated user
// ---------------------------------------------------------------------------

async function getMeeting(id: string) {
  const supabase = getSupabaseServer();
  if (!supabase || !authenticatedUserId) return null;
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", authenticatedUserId)
    .single();
  return data;
}

async function listMeetings(limit: number) {
  const supabase = getSupabaseServer();
  if (!supabase || !authenticatedUserId) return [];
  const { data } = await supabase
    .from("meetings")
    .select("id, title, status, duration_seconds, created_at")
    .eq("user_id", authenticatedUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    title: m.title ?? "Untitled",
    status: m.status,
    duration: m.duration_seconds ? `${Math.round(Number(m.duration_seconds) / 60)} min` : null,
    date: m.created_at,
  }));
}

// ---------------------------------------------------------------------------
// MCP handler with tools
// ---------------------------------------------------------------------------

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      "search_meetings",
      "Search meeting transcripts and summaries using natural language.",
      {
        query: z.string().describe("Natural language search query"),
        limit: z.number().int().min(1).max(50).optional(),
      },
      async ({ query, limit }) => {
        if (!authenticatedUserId) return { content: [{ type: "text" as const, text: "Not authenticated" }] };
        const results = await searchMeetings(query, authenticatedUserId, limit ?? 10);
        return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
      },
    );

    server.tool(
      "get_meeting",
      "Get full details of a meeting including transcript, summary, and cost.",
      { meeting_id: z.string() },
      async ({ meeting_id }) => {
        const meeting = await getMeeting(meeting_id);
        return { content: [{ type: "text" as const, text: meeting ? JSON.stringify(meeting, null, 2) : "Meeting not found" }] };
      },
    );

    server.tool(
      "list_meetings",
      "List recent meetings with status, title, and duration.",
      { limit: z.number().int().min(1).max(100).optional() },
      async ({ limit }) => {
        const meetings = await listMeetings(limit ?? 20);
        return { content: [{ type: "text" as const, text: JSON.stringify(meetings, null, 2) }] };
      },
    );

    server.tool(
      "get_transcript",
      "Get the full transcript text of a meeting.",
      { meeting_id: z.string() },
      async ({ meeting_id }) => {
        const m = await getMeeting(meeting_id);
        return { content: [{ type: "text" as const, text: (m?.text as string) ?? "No transcript available" }] };
      },
    );

    server.tool(
      "get_summary",
      "Get the AI-generated summary including key points, action items, decisions.",
      { meeting_id: z.string() },
      async ({ meeting_id }) => {
        const m = await getMeeting(meeting_id);
        return { content: [{ type: "text" as const, text: m?.summary ? JSON.stringify(m.summary, null, 2) : "No summary available" }] };
      },
    );
  },
  { serverInfo: { name: "layer-one-audio", version: "1.0.0" } },
  { basePath: "/api/mcp", maxDuration: 60 },
);

// ---------------------------------------------------------------------------
// Wrap: auth check → then MCP handler
// ---------------------------------------------------------------------------

async function authedHandler(req: Request) {
  const authError = await authenticateRequest(req);
  if (authError) return authError;
  return mcpHandler(req);
}

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
