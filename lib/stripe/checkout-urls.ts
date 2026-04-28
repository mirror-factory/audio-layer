import type { NextRequest } from "next/server";

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, "");
}

export function checkoutBaseUrl(req: NextRequest): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (configured && process.env.NODE_ENV === "production") {
    return trimTrailingSlash(configured);
  }

  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || req.headers.get("host") || "";
  if (host) {
    const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
    const protocol = forwardedProto || req.nextUrl.protocol.replace(":", "") || "https";
    return `${protocol}://${host}`;
  }

  return trimTrailingSlash(req.nextUrl.origin);
}

export function checkoutRedirectUrls(req: NextRequest): {
  successUrl: string;
  cancelUrl: string;
} {
  const appUrl = checkoutBaseUrl(req);
  return {
    successUrl: `${appUrl}/?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancelUrl: `${appUrl}/pricing?checkout=canceled`,
  };
}
