export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import {
  createMcpAccessToken,
  createRefreshToken,
  hashOAuthToken,
  MCP_ACCESS_TOKEN_TTL_SECONDS,
  MCP_OAUTH_SCOPE,
  MCP_REFRESH_TOKEN_TTL_SECONDS,
  verifyPkceChallenge,
} from "@/lib/oauth/mcp-oauth";

type TokenBody = Record<string, string | null>;

async function readTokenBody(req: NextRequest): Promise<TokenBody | null> {
  const contentType = req.headers.get("content-type") ?? "";

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData().catch(() => null);
    if (!form) return null;
    return Object.fromEntries(
      Array.from(form.entries()).map(([key, value]) => [
        key,
        typeof value === "string" ? value : null,
      ]),
    );
  }

  const json = await req.json().catch(() => null);
  if (!json || typeof json !== "object") return null;
  return json as TokenBody;
}

function tokenError(
  error: string,
  errorDescription: string,
  status = 400,
): NextResponse {
  return NextResponse.json(
    { error, error_description: errorDescription },
    {
      status,
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}

function tokenResponse(body: Record<string, unknown>): NextResponse {
  return NextResponse.json(body, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}

async function storeRefreshToken(
  supabase: NonNullable<ReturnType<typeof getSupabaseServer>>,
  userId: string,
  clientId: string | null,
  scope: string,
): Promise<string | null> {
  const refreshToken = createRefreshToken();
  const { error } = await supabase.from("oauth_refresh_tokens").insert({
    client_id: clientId,
    expires_at: new Date(
      Date.now() + MCP_REFRESH_TOKEN_TTL_SECONDS * 1000,
    ).toISOString(),
    scope,
    token_hash: hashOAuthToken(refreshToken),
    user_id: userId,
  });

  return error ? null : refreshToken;
}

async function issueTokens(
  supabase: NonNullable<ReturnType<typeof getSupabaseServer>>,
  userId: string,
  clientId: string | null,
  scope: string,
) {
  const accessToken = await createMcpAccessToken(userId, scope);
  const refreshToken = await storeRefreshToken(supabase, userId, clientId, scope);

  if (!refreshToken) {
    return tokenError(
      "server_error",
      "Failed to create refresh token",
      500,
    );
  }

  return tokenResponse({
    access_token: accessToken,
    expires_in: MCP_ACCESS_TOKEN_TTL_SECONDS,
    refresh_token: refreshToken,
    scope,
    token_type: "Bearer",
  });
}

async function exchangeAuthorizationCode(
  body: TokenBody,
): Promise<NextResponse> {
  const code = body.code;
  const codeVerifier = body.code_verifier;
  const redirectUri = body.redirect_uri;
  const clientId = body.client_id ?? null;

  if (!code || !codeVerifier || !redirectUri) {
    return tokenError(
      "invalid_grant",
      "code, code_verifier, and redirect_uri are required",
    );
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return tokenError("server_error", "Database not configured", 503);
  }

  const { data: codeRecord, error } = await supabase
    .from("oauth_codes")
    .select(
      "user_id, redirect_uri, expires_at, code_challenge, code_challenge_method, client_id, scope",
    )
    .eq("code", code)
    .single();

  if (error || !codeRecord) {
    return tokenError("invalid_grant", "Invalid authorization code");
  }

  await supabase.from("oauth_codes").delete().eq("code", code);

  if (new Date(codeRecord.expires_at as string) < new Date()) {
    return tokenError("invalid_grant", "Authorization code expired");
  }

  if (redirectUri !== codeRecord.redirect_uri) {
    return tokenError("invalid_grant", "redirect_uri mismatch");
  }

  if (clientId && codeRecord.client_id && clientId !== codeRecord.client_id) {
    return tokenError("invalid_grant", "client_id mismatch");
  }

  if (
    !verifyPkceChallenge(
      codeVerifier,
      codeRecord.code_challenge as string,
      codeRecord.code_challenge_method as string,
    )
  ) {
    return tokenError("invalid_grant", "Invalid PKCE code_verifier");
  }

  return issueTokens(
    supabase,
    codeRecord.user_id as string,
    (codeRecord.client_id as string | null) ?? clientId,
    (codeRecord.scope as string | null) ?? MCP_OAUTH_SCOPE,
  );
}

async function exchangeRefreshToken(body: TokenBody): Promise<NextResponse> {
  const refreshToken = body.refresh_token;
  const clientId = body.client_id ?? null;

  if (!refreshToken) {
    return tokenError("invalid_grant", "refresh_token is required");
  }

  const supabase = getSupabaseServer();
  if (!supabase) {
    return tokenError("server_error", "Database not configured", 503);
  }

  const tokenHash = hashOAuthToken(refreshToken);
  const { data: tokenRecord, error } = await supabase
    .from("oauth_refresh_tokens")
    .select("user_id, client_id, scope, expires_at, revoked_at")
    .eq("token_hash", tokenHash)
    .single();

  if (error || !tokenRecord) {
    return tokenError("invalid_grant", "Invalid refresh token");
  }

  if (tokenRecord.revoked_at) {
    return tokenError("invalid_grant", "Refresh token has been revoked");
  }

  if (new Date(tokenRecord.expires_at as string) < new Date()) {
    return tokenError("invalid_grant", "Refresh token expired");
  }

  if (clientId && tokenRecord.client_id && clientId !== tokenRecord.client_id) {
    return tokenError("invalid_grant", "client_id mismatch");
  }

  await supabase
    .from("oauth_refresh_tokens")
    .update({ revoked_at: new Date().toISOString() })
    .eq("token_hash", tokenHash);

  return issueTokens(
    supabase,
    tokenRecord.user_id as string,
    (tokenRecord.client_id as string | null) ?? clientId,
    (tokenRecord.scope as string | null) ?? MCP_OAUTH_SCOPE,
  );
}

export async function POST(req: NextRequest) {
  const body = await readTokenBody(req);
  if (!body) {
    return tokenError("invalid_request", "Malformed token request body");
  }

  if (body.grant_type === "authorization_code") {
    return exchangeAuthorizationCode(body);
  }

  if (body.grant_type === "refresh_token") {
    return exchangeRefreshToken(body);
  }

  return tokenError("unsupported_grant_type", "Unsupported grant_type");
}
