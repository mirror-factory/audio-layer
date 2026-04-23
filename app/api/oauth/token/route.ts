export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { SignJWT } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.MCP_JWT_SECRET ?? process.env.SUPABASE_JWT_SECRET ?? "mcp-fallback-secret-change-me",
);

/**
 * OAuth 2.1 Token Endpoint
 *
 * Exchanges an authorization code for an access token (JWT).
 * The JWT contains the user_id and is validated by the MCP route.
 */
export async function POST(req: NextRequest) {
  const body = await req.formData().catch(() => null) ?? await req.json().catch(() => null);

  let grantType: string | null = null;
  let code: string | null = null;
  let redirectUri: string | null = null;

  if (body instanceof FormData) {
    grantType = body.get("grant_type") as string;
    code = body.get("code") as string;
    redirectUri = body.get("redirect_uri") as string;
  } else if (body && typeof body === "object") {
    grantType = body.grant_type;
    code = body.code;
    redirectUri = body.redirect_uri;
  }

  if (grantType !== "authorization_code" || !code) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Missing or invalid grant_type/code" },
      { status: 400 },
    );
  }

  // Look up the authorization code
  const supabase = getSupabaseServer();
  if (!supabase) {
    return NextResponse.json(
      { error: "server_error", error_description: "Database not configured" },
      { status: 503 },
    );
  }

  const { data: codeRecord, error } = await supabase
    .from("oauth_codes")
    .select("user_id, redirect_uri, expires_at")
    .eq("code", code)
    .single();

  if (error || !codeRecord) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Invalid authorization code" },
      { status: 400 },
    );
  }

  // Verify expiry
  if (new Date(codeRecord.expires_at) < new Date()) {
    await supabase.from("oauth_codes").delete().eq("code", code);
    return NextResponse.json(
      { error: "invalid_grant", error_description: "Authorization code expired" },
      { status: 400 },
    );
  }

  // Verify redirect_uri matches (if provided)
  if (redirectUri && redirectUri !== codeRecord.redirect_uri) {
    return NextResponse.json(
      { error: "invalid_grant", error_description: "redirect_uri mismatch" },
      { status: 400 },
    );
  }

  // Delete the code (one-time use)
  await supabase.from("oauth_codes").delete().eq("code", code);

  // Issue a JWT access token
  const accessToken = await new SignJWT({ sub: codeRecord.user_id, scope: "mcp:tools" })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .setIssuer("layer-one-audio")
    .sign(JWT_SECRET);

  return NextResponse.json({
    access_token: accessToken,
    token_type: "Bearer",
    expires_in: 7 * 24 * 60 * 60,
    scope: "mcp:tools",
  }, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
