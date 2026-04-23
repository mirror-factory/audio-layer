import { createMcpHandler } from "mcp-handler";
import { z } from "zod";
import { getSupabaseServer } from "@/lib/supabase/server";
import { searchMeetings } from "@/lib/embeddings/search";
import { validateApiKey } from "@/lib/mcp/auth";

const BASE_URL = "https://audio-layer.vercel.app";

// Per-request user ID set by the auth wrapper
let authenticatedUserId: string | null = null;

// ---------------------------------------------------------------------------
// Query helpers (service role, scoped by user_id)
// ---------------------------------------------------------------------------

async function getMeeting(id: string) {
  const supabase = getSupabaseServer();
  if (!supabase || !authenticatedUserId) return null;
  const { data } = await supabase
    .from("meetings").select("*")
    .eq("id", id).eq("user_id", authenticatedUserId).single();
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
// MCP tools
// ---------------------------------------------------------------------------

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool("search_meetings", "Search meeting transcripts and summaries using natural language.", {
      query: z.string().describe("Natural language search query"),
      limit: z.number().int().min(1).max(50).optional(),
    }, async ({ query, limit }) => {
      if (!authenticatedUserId) return { content: [{ type: "text" as const, text: "Not authenticated" }] };
      const results = await searchMeetings(query, authenticatedUserId, limit ?? 10);
      return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
    });

    server.tool("get_meeting", "Get full meeting details including transcript, summary, cost.", {
      meeting_id: z.string(),
    }, async ({ meeting_id }) => {
      const m = await getMeeting(meeting_id);
      return { content: [{ type: "text" as const, text: m ? JSON.stringify(m, null, 2) : "Meeting not found" }] };
    });

    server.tool("list_meetings", "List recent meetings with status, title, duration.", {
      limit: z.number().int().min(1).max(100).optional(),
    }, async ({ limit }) => {
      const meetings = await listMeetings(limit ?? 20);
      return { content: [{ type: "text" as const, text: JSON.stringify(meetings, null, 2) }] };
    });

    server.tool("get_transcript", "Get the full transcript text of a meeting.", {
      meeting_id: z.string(),
    }, async ({ meeting_id }) => {
      const m = await getMeeting(meeting_id);
      return { content: [{ type: "text" as const, text: (m?.text as string) ?? "No transcript available" }] };
    });

    server.tool("get_summary", "Get the AI-generated summary with key points, action items, decisions.", {
      meeting_id: z.string(),
    }, async ({ meeting_id }) => {
      const m = await getMeeting(meeting_id);
      return { content: [{ type: "text" as const, text: m?.summary ? JSON.stringify(m.summary, null, 2) : "No summary available" }] };
    });
  },
  { serverInfo: { name: "layer-one-audio", version: "1.0.0" } },
  { basePath: "/api/mcp", maxDuration: 60 },
);

// ---------------------------------------------------------------------------
// Auth wrapper — validates API key, sets userId for tool queries
// ---------------------------------------------------------------------------

// Auth wrapper that allows initialize/notifications without auth
// but requires auth for tools/list and tools/call
async function handler(req: Request) {
  // Clone request to peek at the body for method routing
  const cloned = req.clone();
  let isProtocolHandshake = false;

  if (req.method === "POST") {
    try {
      const body = await cloned.json();
      const method = body?.method as string;
      isProtocolHandshake = method === "initialize" || method?.startsWith("notifications/");
    } catch {
      // not JSON — let mcp-handler deal with it
    }
  }

  // Allow protocol handshake without auth
  if (isProtocolHandshake || req.method === "DELETE") {
    return mcpHandler(req);
  }

  // Everything else (tools/list, tools/call, GET for SSE) requires auth
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) {
    return new Response(
      JSON.stringify({ error: "invalid_token", error_description: "Bearer token required. Get your API key from the Layer One Audio profile page." }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${BASE_URL}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  const key = auth.slice(7);
  const result = await validateApiKey(key);
  if (!result) {
    return new Response(
      JSON.stringify({ error: "invalid_token", error_description: "Invalid API key" }),
      { status: 401, headers: { "Content-Type": "application/json" } },
    );
  }

  authenticatedUserId = result.userId;
  return mcpHandler(req);
}

export { handler as GET, handler as POST, handler as DELETE };
