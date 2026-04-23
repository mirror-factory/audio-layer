import { createMcpHandler, withMcpAuth } from "mcp-handler";
import { z } from "zod";
import { jwtVerify } from "jose";
import { getSupabaseServer } from "@/lib/supabase/server";
import { searchMeetings } from "@/lib/embeddings/search";
import { validateApiKey } from "@/lib/mcp/auth";

const JWT_SECRET = new TextEncoder().encode(
  process.env.MCP_JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? "mcp-fallback-secret-change-me",
);

const BASE_URL = "https://audio-layer.vercel.app";

// Store the authenticated user ID per-request
let requestUserId: string | null = null;

// Helper: query meetings using service role (bypasses RLS)
async function getMeeting(id: string) {
  const supabase = getSupabaseServer();
  if (!supabase || !requestUserId) return null;
  const { data } = await supabase
    .from("meetings")
    .select("*")
    .eq("id", id)
    .eq("user_id", requestUserId)
    .single();
  return data;
}

async function listMeetings(limit: number) {
  const supabase = getSupabaseServer();
  if (!supabase || !requestUserId) return [];
  const { data } = await supabase
    .from("meetings")
    .select("id, title, status, duration_seconds, created_at")
    .eq("user_id", requestUserId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((m: Record<string, unknown>) => ({
    id: m.id,
    title: m.title ?? "Untitled",
    status: m.status,
    durationSeconds: m.duration_seconds,
    createdAt: m.created_at,
  }));
}

const mcpHandler = createMcpHandler(
  (server) => {
    server.tool(
      "search_meetings",
      "Search meeting transcripts and summaries using natural language.",
      {
        query: z.string().describe("Natural language search query"),
        limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
      },
      async ({ query, limit }) => {
        if (!requestUserId) return { content: [{ type: "text" as const, text: "Not authenticated" }] };
        const results = await searchMeetings(query, requestUserId, limit ?? 10);
        return { content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }] };
      },
    );

    server.tool(
      "get_meeting",
      "Get full details of a meeting including transcript, summary, and cost.",
      { meeting_id: z.string().describe("The meeting ID") },
      async ({ meeting_id }) => {
        const meeting = await getMeeting(meeting_id);
        return {
          content: [{ type: "text" as const, text: meeting ? JSON.stringify(meeting, null, 2) : "Meeting not found" }],
        };
      },
    );

    server.tool(
      "list_meetings",
      "List recent meetings with status, title, and duration.",
      { limit: z.number().int().min(1).max(100).optional().describe("Max meetings (default 20)") },
      async ({ limit }) => {
        const meetings = await listMeetings(limit ?? 20);
        return { content: [{ type: "text" as const, text: JSON.stringify(meetings, null, 2) }] };
      },
    );

    server.tool(
      "get_transcript",
      "Get the full transcript text of a meeting.",
      { meeting_id: z.string().describe("The meeting ID") },
      async ({ meeting_id }) => {
        const meeting = await getMeeting(meeting_id);
        return { content: [{ type: "text" as const, text: meeting?.text ?? "No transcript available" }] };
      },
    );

    server.tool(
      "get_summary",
      "Get the AI-generated summary including key points, action items, decisions.",
      { meeting_id: z.string().describe("The meeting ID") },
      async ({ meeting_id }) => {
        const meeting = await getMeeting(meeting_id);
        const summary = meeting?.summary;
        return {
          content: [{
            type: "text" as const,
            text: summary ? JSON.stringify(summary, null, 2) : "No summary available",
          }],
        };
      },
    );
  },
  {
    serverInfo: {
      name: "layer-one-audio",
      version: "1.0.0",
    },
  },
  {
    basePath: "/api/mcp",
    maxDuration: 60,
  },
);

// Wrap with auth — verifies JWT or API key, sets requestUserId
const authedHandler = withMcpAuth(
  mcpHandler,
  async (_req: Request, bearerToken?: string) => {
    if (!bearerToken) return undefined;

    // Try JWT first (OAuth flow)
    try {
      const { payload } = await jwtVerify(bearerToken, JWT_SECRET, { issuer: "layer-one-audio" });
      if (payload.sub) {
        requestUserId = payload.sub;
        return {
          token: bearerToken,
          clientId: "layer-one-oauth",
          scopes: ["mcp:tools"],
          extra: { userId: payload.sub },
        };
      }
    } catch {
      // Not a JWT
    }

    // Try API key
    const apiKeyAuth = await validateApiKey(bearerToken);
    if (apiKeyAuth) {
      requestUserId = apiKeyAuth.userId;
      return {
        token: bearerToken,
        clientId: "layer-one-apikey",
        scopes: ["mcp:tools"],
        extra: { userId: apiKeyAuth.userId },
      };
    }

    return undefined;
  },
  {
    required: true,
    resourceUrl: `${BASE_URL}/api/mcp/mcp`,
  },
);

export { authedHandler as GET, authedHandler as POST, authedHandler as DELETE };
