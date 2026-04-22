export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse, type NextRequest } from "next/server";
import { withRoute } from "@/lib/with-route";
import { validateApiKey } from "@/lib/mcp/auth";
import { MCP_TOOLS } from "@/lib/mcp/tools";
import { log } from "@/lib/logger";

// ---------------------------------------------------------------------------
// JSON-RPC types (MCP protocol subset)
// ---------------------------------------------------------------------------

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id: string | number | null;
  method: string;
  params?: Record<string, unknown>;
}

interface JsonRpcResponse {
  jsonrpc: "2.0";
  id: string | number | null;
  result?: unknown;
  error?: { code: number; message: string; data?: unknown };
}

function jsonRpcError(
  id: string | number | null,
  code: number,
  message: string,
  data?: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, error: { code, message, data } };
}

function jsonRpcResult(
  id: string | number | null,
  result: unknown,
): JsonRpcResponse {
  return { jsonrpc: "2.0", id, result };
}

// ---------------------------------------------------------------------------
// Auth helper
// ---------------------------------------------------------------------------

function extractBearerToken(req: NextRequest): string | null {
  const auth = req.headers.get("authorization");
  if (!auth?.startsWith("Bearer ")) return null;
  return auth.slice(7);
}

// ---------------------------------------------------------------------------
// MCP method handlers
// ---------------------------------------------------------------------------

function handleInitialize(id: string | number | null): JsonRpcResponse {
  return jsonRpcResult(id, {
    protocolVersion: "2024-11-05",
    capabilities: { tools: { listChanged: false } },
    serverInfo: {
      name: "layer-one-audio",
      version: "1.0.0",
    },
  });
}

function handleToolsList(id: string | number | null): JsonRpcResponse {
  const tools = MCP_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    inputSchema: zodToJsonSchema(t.schema),
  }));
  return jsonRpcResult(id, { tools });
}

async function handleToolsCall(
  id: string | number | null,
  params: Record<string, unknown>,
  userId: string,
): Promise<JsonRpcResponse> {
  const toolName = params.name as string;
  const toolArgs = (params.arguments ?? {}) as Record<string, unknown>;

  const tool = MCP_TOOLS.find((t) => t.name === toolName);
  if (!tool) {
    return jsonRpcError(id, -32602, `Unknown tool: ${toolName}`);
  }

  const parsed = tool.schema.safeParse(toolArgs);
  if (!parsed.success) {
    return jsonRpcError(id, -32602, "Invalid tool arguments", {
      issues: parsed.error.issues,
    });
  }

  try {
    const result = await tool.handler(parsed.data, userId);
    return jsonRpcResult(id, {
      content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Tool execution failed";
    return jsonRpcError(id, -32603, message);
  }
}

// ---------------------------------------------------------------------------
// Zod -> JSON Schema (minimal)
// ---------------------------------------------------------------------------

function zodToJsonSchema(schema: unknown): Record<string, unknown> {
  // Zod v4 provides a `toJSONSchema()` or we can use the shape
  try {
    // Zod 4 built-in
    if (
      schema &&
      typeof schema === "object" &&
      "toJSONSchema" in schema &&
      typeof (schema as { toJSONSchema: () => unknown }).toJSONSchema === "function"
    ) {
      return (schema as { toJSONSchema: () => Record<string, unknown> }).toJSONSchema();
    }
  } catch {
    // fall through
  }

  // Fallback: return a permissive schema
  return { type: "object", properties: {}, additionalProperties: true };
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export const POST = withRoute(async (req) => {
  // Authenticate
  const token = extractBearerToken(req);
  if (!token) {
    return NextResponse.json(
      { error: "Missing Authorization: Bearer <api_key> header" },
      { status: 401 },
    );
  }

  const auth = await validateApiKey(token);
  if (!auth) {
    return NextResponse.json(
      { error: "Invalid API key" },
      { status: 401 },
    );
  }

  // Parse JSON-RPC request
  let rpc: JsonRpcRequest;
  try {
    rpc = (await req.json()) as JsonRpcRequest;
  } catch {
    return NextResponse.json(
      jsonRpcError(null, -32700, "Parse error"),
      { status: 400 },
    );
  }

  if (rpc.jsonrpc !== "2.0") {
    return NextResponse.json(
      jsonRpcError(rpc.id ?? null, -32600, "Invalid JSON-RPC version"),
      { status: 400 },
    );
  }

  log.info("mcp.request", {
    method: rpc.method,
    userId: auth.userId,
  });

  // Route methods
  let response: JsonRpcResponse;

  switch (rpc.method) {
    case "initialize":
      response = handleInitialize(rpc.id);
      break;

    case "tools/list":
      response = handleToolsList(rpc.id);
      break;

    case "tools/call":
      response = await handleToolsCall(
        rpc.id,
        (rpc.params ?? {}) as Record<string, unknown>,
        auth.userId,
      );
      break;

    case "notifications/initialized":
      // Client acknowledgment -- no response needed per spec
      response = jsonRpcResult(rpc.id, {});
      break;

    default:
      response = jsonRpcError(
        rpc.id,
        -32601,
        `Method not found: ${rpc.method}`,
      );
  }

  return NextResponse.json(response);
});
