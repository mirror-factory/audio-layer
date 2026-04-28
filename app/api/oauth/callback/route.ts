export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";

/**
 * Legacy bridge for older sign-in redirects.
 *
 * The real MCP OAuth approval step is `/oauth/consent`, where the user sees
 * the permission screen and the server stores a PKCE-bound authorization code.
 */
export function GET(req: NextRequest) {
  const url = new URL(req.url);
  return NextResponse.redirect(
    `${url.origin}/oauth/consent?${url.searchParams.toString()}`,
  );
}
