export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { parseOAuthAuthorizeParams } from "@/lib/oauth/mcp-oauth";

/**
 * OAuth 2.1 Authorization Endpoint
 *
 * Claude Desktop opens this URL in a browser. We redirect to our
 * sign-in page with the OAuth params preserved. After the user logs in,
 * they get redirected to /api/oauth/callback which issues the auth code
 * back to Claude.
 */
export function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

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

  const baseUrl = new URL(req.url).origin;
  const oauthParams = new URLSearchParams({
    response_type: parsed.value.responseType,
    redirect_uri: parsed.value.redirectUri,
    state: parsed.value.state,
    code_challenge: parsed.value.codeChallenge,
    code_challenge_method: parsed.value.codeChallengeMethod,
    scope: parsed.value.scope,
  });

  if (parsed.value.clientId) {
    oauthParams.set("client_id", parsed.value.clientId);
  }

  return NextResponse.redirect(`${baseUrl}/oauth/consent?${oauthParams}`);
}
