export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

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
  const clientId = searchParams.get("client_id");
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const scope = searchParams.get("scope");

  if (!redirectUri || !state) {
    return NextResponse.json({ error: "Missing redirect_uri or state" }, { status: 400 });
  }

  // Store OAuth params in the redirect so our callback can pick them up
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim() ?? "https://audio-layer.vercel.app";
  const oauthParams = new URLSearchParams({
    ...(clientId && { client_id: clientId }),
    redirect_uri: redirectUri,
    state,
    ...(codeChallenge && { code_challenge: codeChallenge }),
    ...(codeChallengeMethod && { code_challenge_method: codeChallengeMethod }),
    ...(scope && { scope }),
  });

  // Redirect to our sign-in page with oauth_flow flag
  const signInUrl = `${baseUrl}/sign-in?oauth=1&${oauthParams.toString()}`;
  return NextResponse.redirect(signInUrl);
}
