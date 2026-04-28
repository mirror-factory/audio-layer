export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { getSupabaseServer } from "@/lib/supabase/server";
import { getSupabaseUser } from "@/lib/supabase/user";
import {
  appendOAuthCode,
  appendOAuthError,
  parseOAuthAuthorizeParams,
} from "@/lib/oauth/mcp-oauth";

export async function POST(req: NextRequest) {
  const form = await req.formData().catch(() => null);
  if (!form) {
    return NextResponse.json(
      { error: "invalid_request", error_description: "Expected form data" },
      { status: 400 },
    );
  }

  const decision = form.get("decision");
  const searchParams = new URLSearchParams();

  for (const [key, value] of form.entries()) {
    if (key !== "decision" && typeof value === "string") {
      searchParams.append(key, value);
    }
  }

  const parsed = parseOAuthAuthorizeParams(searchParams);
  if (!parsed.ok) {
    return NextResponse.json(
      {
        error: parsed.error.error,
        error_description: parsed.error.errorDescription,
      },
      { status: parsed.error.status },
    );
  }

  if (decision !== "allow") {
    return NextResponse.redirect(
      appendOAuthError(
        parsed.value.redirectUri,
        parsed.value.state,
        "access_denied",
        "The user denied Layer One MCP access.",
      ),
    );
  }

  const userSupabase = await getSupabaseUser();
  if (!userSupabase) {
    return NextResponse.json({ error: "Auth not configured" }, { status: 503 });
  }

  const {
    data: { user },
  } = await userSupabase.auth.getUser();
  if (!user || user.is_anonymous) {
    return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  }

  const serviceSupabase = getSupabaseServer();
  if (!serviceSupabase) {
    return NextResponse.json(
      { error: "server_error", error_description: "Database not configured" },
      { status: 503 },
    );
  }

  const code = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();
  const { error } = await serviceSupabase.from("oauth_codes").insert({
    client_id: parsed.value.clientId,
    code,
    code_challenge: parsed.value.codeChallenge,
    code_challenge_method: parsed.value.codeChallengeMethod,
    expires_at: expiresAt,
    redirect_uri: parsed.value.redirectUri,
    scope: parsed.value.scope,
    user_id: user.id,
  });

  if (error) {
    return NextResponse.json(
      {
        error: "server_error",
        error_description: "Failed to create authorization code",
      },
      { status: 500 },
    );
  }

  return NextResponse.redirect(
    appendOAuthCode(parsed.value.redirectUri, code, parsed.value.state),
  );
}
