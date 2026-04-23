export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * Protected Resource Metadata (RFC 9728)
 * Tells MCP clients where to get tokens for this server.
 */
export function GET() {
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? (process.env.VERCEL_PROJECT_PRODUCTION_URL ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}` : "https://audio-layer.vercel.app");

  return NextResponse.json({
    resource: `${baseUrl}/api/mcp`,
    authorization_servers: [`${baseUrl}`],
    bearer_methods_supported: ["header"],
    scopes_supported: ["mcp:tools"],
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, max-age=3600",
    },
  });
}
