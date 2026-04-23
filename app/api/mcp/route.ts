export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { WebStandardStreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js";
import { z } from "zod";
import { jwtVerify } from "jose";
import { validateApiKey } from "@/lib/mcp/auth";
import { getMeetingsStore } from "@/lib/meetings/store";
import { searchMeetings } from "@/lib/embeddings/search";

const JWT_SECRET = new TextEncoder().encode(
  process.env.MCP_JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? "mcp-fallback-secret-change-me",
);

// ---------------------------------------------------------------------------
// Auth helper — supports both OAuth JWT and legacy API keys
// ---------------------------------------------------------------------------

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

async function authenticateToken(token: string): Promise<{ userId: string } | null> {
  // Try JWT first (OAuth flow)
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: "layer-one-audio" });
    if (payload.sub) {
      return { userId: payload.sub };
    }
  } catch {
    // Not a valid JWT — try API key
  }

  // Fallback: legacy API key
  return validateApiKey(token);
}

// ---------------------------------------------------------------------------
// Create MCP server with tools
// ---------------------------------------------------------------------------

function createMcpServer(userId: string) {
  const server = new McpServer({
    name: "layer-one-audio",
    version: "1.0.0",
  });

  server.tool(
    "search_meetings",
    "Search through meeting transcripts, summaries, and data using natural language. Returns ranked results by semantic similarity.",
    {
      query: z.string().describe("Natural language search query"),
      limit: z.number().int().min(1).max(50).optional().describe("Max results (default 10)"),
    },
    async ({ query, limit }) => {
      const results = await searchMeetings(query, userId, limit ?? 10);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(results, null, 2) }],
      };
    },
  );

  server.tool(
    "get_meeting",
    "Get full details of a specific meeting including transcript, summary, and cost breakdown.",
    {
      meeting_id: z.string().describe("The meeting ID"),
    },
    async ({ meeting_id }) => {
      const store = await getMeetingsStore();
      const meeting = await store.get(meeting_id);
      return {
        content: [{ type: "text" as const, text: meeting ? JSON.stringify(meeting, null, 2) : "Meeting not found" }],
      };
    },
  );

  server.tool(
    "list_meetings",
    "List recent meetings with their status, title, and duration.",
    {
      limit: z.number().int().min(1).max(100).optional().describe("Max meetings (default 20)"),
    },
    async ({ limit }) => {
      const store = await getMeetingsStore();
      const meetings = await store.list(limit ?? 20);
      return {
        content: [{ type: "text" as const, text: JSON.stringify(meetings, null, 2) }],
      };
    },
  );

  server.tool(
    "get_transcript",
    "Get the full transcript text of a meeting.",
    {
      meeting_id: z.string().describe("The meeting ID"),
    },
    async ({ meeting_id }) => {
      const store = await getMeetingsStore();
      const meeting = await store.get(meeting_id);
      return {
        content: [{ type: "text" as const, text: meeting?.text ?? "No transcript available" }],
      };
    },
  );

  server.tool(
    "get_summary",
    "Get the AI-generated summary of a meeting including key points, action items, and decisions.",
    {
      meeting_id: z.string().describe("The meeting ID"),
    },
    async ({ meeting_id }) => {
      const store = await getMeetingsStore();
      const meeting = await store.get(meeting_id);
      return {
        content: [{ type: "text" as const, text: meeting?.summary ? JSON.stringify(meeting.summary, null, 2) : "No summary available" }],
      };
    },
  );

  server.tool(
    "start_recording",
    "Start a new audio recording session. Note: recording must be initiated from the app UI.",
    {},
    async () => {
      return {
        content: [{ type: "text" as const, text: "Recording must be started from the app UI. Navigate to /record/live in the Layer One Audio app." }],
      };
    },
  );

  // ---------------------------------------------------------------------------
  // MCP Resources — browsable meeting data
  // ---------------------------------------------------------------------------

  server.resource(
    "meetings-list",
    "meetings://list",
    { description: "List of all your meetings", mimeType: "application/json" },
    async () => {
      const store = await getMeetingsStore();
      const meetings = await store.list(50);
      const formatted = meetings.map((m) => ({
        id: m.id,
        title: m.title ?? "Untitled",
        date: m.createdAt,
        duration: m.durationSeconds ? `${Math.round(m.durationSeconds / 60)} min` : null,
        status: m.status,
      }));
      return {
        contents: [{
          uri: "meetings://list",
          mimeType: "application/json",
          text: JSON.stringify(formatted, null, 2),
        }],
      };
    },
  );

  server.resource(
    "meeting-detail",
    "meetings://detail/{meetingId}",
    { description: "Full details of a specific meeting", mimeType: "application/json" },
    async (uri) => {
      const meetingId = uri.pathname.split("/").pop() ?? "";
      const store = await getMeetingsStore();
      const meeting = await store.get(meetingId);
      return {
        contents: [{
          uri: uri.href,
          mimeType: "application/json",
          text: meeting ? JSON.stringify({
            id: meeting.id,
            title: meeting.title,
            date: meeting.createdAt,
            duration: meeting.durationSeconds,
            status: meeting.status,
            summary: meeting.summary,
            utteranceCount: meeting.utterances.length,
            transcript: meeting.text?.substring(0, 5000),
          }, null, 2) : "Meeting not found",
        }],
      };
    },
  );

  return server;
}

// ---------------------------------------------------------------------------
// Stateless handler — one transport per request
// ---------------------------------------------------------------------------

async function handleMcpRequest(req: NextRequest): Promise<Response> {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://audio-layer.vercel.app");

  // Authenticate
  const token = extractBearerToken(req);
  if (!token) {
    return new NextResponse(
      JSON.stringify({ error: "Authorization required" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  const auth = await authenticateToken(token);
  if (!auth) {
    return new NextResponse(
      JSON.stringify({ error: "Invalid or expired token" }),
      {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
        },
      },
    );
  }

  const server = createMcpServer(auth.userId);
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  await server.connect(transport);

  const response = await transport.handleRequest(req);

  return response;
}

// Streamable HTTP needs both GET (SSE) and POST (messages)
export async function GET(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function POST(req: NextRequest) {
  return handleMcpRequest(req);
}

export async function DELETE(req: NextRequest) {
  return handleMcpRequest(req);
}
