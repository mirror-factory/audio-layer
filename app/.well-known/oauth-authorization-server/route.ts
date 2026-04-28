export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";

/**
 * OAuth 2.1 Authorization Server Metadata (RFC 8414)
 * Tells MCP clients how to authenticate with Layer One Audio.
 */
export function GET(req: Request) {
  const baseUrl = new URL(req.url).origin;

  return NextResponse.json({
    issuer: baseUrl,
    authorization_endpoint: `${baseUrl}/api/oauth/authorize`,
    revocation_endpoint: `${baseUrl}/api/oauth/revoke`,
    token_endpoint: `${baseUrl}/api/oauth/token`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code", "refresh_token"],
    code_challenge_methods_supported: ["S256"],
    scopes_supported: ["mcp:tools"],
    token_endpoint_auth_methods_supported: ["none"],
    revocation_endpoint_auth_methods_supported: ["none"],
  }, {
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Cache-Control": "public, no-cache, max-age=0",
    },
  });
}
