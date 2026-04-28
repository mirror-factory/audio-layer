export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

export function GET(req: Request) {
  const origin = new URL(req.url).origin;

  return NextResponse.json(
    {
      resource: `${origin}/api/mcp/mcp`,
      authorization_servers: [origin],
      bearer_methods_supported: ["header"],
      scopes_supported: ["mcp:tools"],
    },
    {
      headers: {
        "Access-Control-Allow-Headers": "*",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Max-Age": "86400",
        "Cache-Control": "max-age=3600",
      },
    },
  );
}
