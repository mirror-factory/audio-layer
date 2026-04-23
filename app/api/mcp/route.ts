export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { jwtVerify } from "jose";
import { validateApiKey } from "@/lib/mcp/auth";
import { getMeetingsStore } from "@/lib/meetings/store";
import { searchMeetings } from "@/lib/embeddings/search";

const JWT_SECRET = new TextEncoder().encode(
  process.env.MCP_JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? "mcp-fallback-secret-change-me",
);

// ---------------------------------------------------------------------------
// Auth — supports both OAuth JWT and legacy API keys
// ---------------------------------------------------------------------------

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

async function authenticateToken(token: string): Promise<{ userId: string } | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, { issuer: "layer-one-audio" });
    if (payload.sub) return { userId: payload.sub };
  } catch {
    // Not a JWT — try API key
  }
  return validateApiKey(token);
}

// ---------------------------------------------------------------------------
// JSON-RPC types
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

function rpcResult(id: string | number | null, result: unknown) {
  return { jsonrpc: "2.0" as const, id, result };
}

function rpcError(id: string | number | null, code: number, message: string) {
  return { jsonrpc: "2.0" as const, id, error: { code, message } };
}

// ---------------------------------------------------------------------------
// Tool definitions
// ---------------------------------------------------------------------------

const TOOLS = [
  {
    name: "search_meetings",
    description: "Search meeting transcripts, summaries using natural language. Returns ranked results.",
    inputSchema: { type: "object", properties: { query: { type: "string", description: "Search query" }, limit: { type: "number", description: "Max results (default 10)" } }, required: ["query"] },
  },
  {
    name: "get_meeting",
    description: "Get full details of a meeting including transcript, summary, and cost.",
    inputSchema: { type: "object", properties: { meeting_id: { type: "string" } }, required: ["meeting_id"] },
  },
  {
    name: "list_meetings",
    description: "List recent meetings with status, title, and duration.",
    inputSchema: { type: "object", properties: { limit: { type: "number", description: "Max meetings (default 20)" } } },
  },
  {
    name: "get_transcript",
    description: "Get the full transcript text of a meeting.",
    inputSchema: { type: "object", properties: { meeting_id: { type: "string" } }, required: ["meeting_id"] },
  },
  {
    name: "get_summary",
    description: "Get the AI-generated summary including key points, action items, decisions.",
    inputSchema: { type: "object", properties: { meeting_id: { type: "string" } }, required: ["meeting_id"] },
  },
];

async function executeTool(name: string, args: Record<string, unknown>, userId: string) {
  const store = await getMeetingsStore();

  switch (name) {
    case "search_meetings": {
      const query = z.string().parse(args.query);
      const limit = z.number().optional().parse(args.limit) ?? 10;
      const results = await searchMeetings(query, userId, limit);
      return JSON.stringify(results, null, 2);
    }
    case "get_meeting": {
      const meeting = await store.get(z.string().parse(args.meeting_id));
      return meeting ? JSON.stringify(meeting, null, 2) : "Meeting not found";
    }
    case "list_meetings": {
      const limit = z.number().optional().parse(args.limit) ?? 20;
      const meetings = await store.list(limit);
      return JSON.stringify(meetings, null, 2);
    }
    case "get_transcript": {
      const meeting = await store.get(z.string().parse(args.meeting_id));
      return meeting?.text ?? "No transcript available";
    }
    case "get_summary": {
      const meeting = await store.get(z.string().parse(args.meeting_id));
      return meeting?.summary ? JSON.stringify(meeting.summary, null, 2) : "No summary available";
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

function getBaseUrl() {
  if (process.env.NEXT_PUBLIC_APP_URL) return process.env.NEXT_PUBLIC_APP_URL.trim();
  if (process.env.VERCEL_PROJECT_PRODUCTION_URL) return `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL.trim()}`;
  return "https://audio-layer.vercel.app";
}

function unauthorizedResponse(baseUrl: string) {
  return new NextResponse(
    JSON.stringify({ jsonrpc: "2.0", error: { code: -32000, message: "Authorization required" } }),
    {
      status: 401,
      headers: {
        "Content-Type": "application/json",
        "WWW-Authenticate": `Bearer resource_metadata="${baseUrl}/.well-known/oauth-protected-resource"`,
      },
    },
  );
}

export async function GET(req: NextRequest) {
  try {
    const baseUrl = getBaseUrl();
    const token = extractBearerToken(req);
    if (!token) return unauthorizedResponse(baseUrl);
    const auth = await authenticateToken(token);
    if (!auth) return unauthorizedResponse(baseUrl);
    return NextResponse.json(rpcError(null, -32600, "GET not supported in stateless mode"), { status: 405 });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
  const baseUrl = getBaseUrl();

  // Auth
  const token = extractBearerToken(req);
  if (!token) return unauthorizedResponse(baseUrl);
  const auth = await authenticateToken(token);
  if (!auth) return unauthorizedResponse(baseUrl);

  // Parse JSON-RPC
  let rpc: JsonRpcRequest;
  try {
    rpc = await req.json();
  } catch {
    return NextResponse.json(rpcError(null, -32700, "Parse error"), { status: 400 });
  }

  if (rpc.jsonrpc !== "2.0") {
    return NextResponse.json(rpcError(rpc.id, -32600, "Invalid JSON-RPC version"), { status: 400 });
  }

  switch (rpc.method) {
    case "initialize":
      return NextResponse.json(rpcResult(rpc.id, {
        protocolVersion: "2024-11-05",
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "layer-one-audio", version: "1.0.0" },
      }));

    case "notifications/initialized":
      return NextResponse.json(rpcResult(rpc.id, {}));

    case "tools/list":
      return NextResponse.json(rpcResult(rpc.id, { tools: TOOLS }));

    case "tools/call": {
      const params = rpc.params ?? {};
      const toolName = params.name as string;
      const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

      if (!TOOLS.find((t) => t.name === toolName)) {
        return NextResponse.json(rpcError(rpc.id, -32602, `Unknown tool: ${toolName}`));
      }

      try {
        const text = await executeTool(toolName, toolArgs, auth.userId);
        return NextResponse.json(rpcResult(rpc.id, {
          content: [{ type: "text", text }],
        }));
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Tool execution failed";
        return NextResponse.json(rpcError(rpc.id, -32603, msg));
      }
    }

    default:
      return NextResponse.json(rpcError(rpc.id, -32601, `Method not found: ${rpc.method}`));
  }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: msg, stack: err instanceof Error ? err.stack : undefined }, { status: 500 });
  }
}

export async function DELETE() {
  return NextResponse.json(rpcResult(null, {}));
}
