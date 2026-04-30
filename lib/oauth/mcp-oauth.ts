import { createHash, randomBytes } from "node:crypto";
import { SignJWT } from "jose";

export const MCP_OAUTH_SCOPE = "mcp:tools";
export const MCP_OAUTH_ISSUER = "layers";
export const MCP_OAUTH_AUDIENCE = "layers-mcp";
export const MCP_ACCESS_TOKEN_TTL_SECONDS = 60 * 60;
export const MCP_REFRESH_TOKEN_TTL_SECONDS = 60 * 60 * 24 * 30;

const JWT_SECRET = new TextEncoder().encode(
  process.env.MCP_JWT_SECRET ??
    process.env.SUPABASE_JWT_SECRET ??
    "mcp-fallback-secret-change-me",
);

export interface OAuthAuthorizeParams {
  clientId: string | null;
  codeChallenge: string;
  codeChallengeMethod: "S256";
  redirectUri: string;
  responseType: "code";
  scope: string;
  state: string;
}

export interface OAuthParamError {
  error: string;
  errorDescription: string;
  status: number;
}

export type OAuthParamResult =
  | { ok: true; value: OAuthAuthorizeParams }
  | { ok: false; error: OAuthParamError };

function isLoopbackHost(hostname: string): boolean {
  return hostname === "localhost" || hostname === "127.0.0.1" || hostname === "::1";
}

export function isAllowedOAuthRedirectUri(value: string): boolean {
  try {
    const url = new URL(value);
    if (url.hash) return false;
    if (url.protocol === "https:") return true;
    if (url.protocol === "http:" && isLoopbackHost(url.hostname)) return true;
    return false;
  } catch {
    return false;
  }
}

export function normalizeMcpScope(scope: string | null): string | null {
  if (!scope?.trim()) return MCP_OAUTH_SCOPE;
  const scopes = new Set(scope.split(/\s+/).filter(Boolean));
  if (!scopes.has(MCP_OAUTH_SCOPE)) return null;
  return MCP_OAUTH_SCOPE;
}

export function parseOAuthAuthorizeParams(
  searchParams: URLSearchParams,
): OAuthParamResult {
  const responseType = searchParams.get("response_type") ?? "code";
  const redirectUri = searchParams.get("redirect_uri");
  const state = searchParams.get("state");
  const codeChallenge = searchParams.get("code_challenge");
  const codeChallengeMethod = searchParams.get("code_challenge_method");
  const scope = normalizeMcpScope(searchParams.get("scope"));

  if (responseType !== "code") {
    return oauthParamError("unsupported_response_type", "response_type must be code");
  }

  if (!redirectUri || !isAllowedOAuthRedirectUri(redirectUri)) {
    return oauthParamError("invalid_request", "redirect_uri must be https or localhost http and must not include a fragment");
  }

  if (!state) {
    return oauthParamError("invalid_request", "state is required");
  }

  if (!scope) {
    return oauthParamError("invalid_scope", `Only ${MCP_OAUTH_SCOPE} is supported`);
  }

  if (!codeChallenge || codeChallengeMethod !== "S256") {
    return oauthParamError("invalid_request", "PKCE S256 code_challenge is required");
  }

  return {
    ok: true,
    value: {
      clientId: searchParams.get("client_id"),
      codeChallenge,
      codeChallengeMethod: "S256",
      redirectUri,
      responseType: "code",
      scope,
      state,
    },
  };
}

function oauthParamError(
  error: string,
  errorDescription: string,
  status = 400,
): { ok: false; error: OAuthParamError } {
  return {
    ok: false,
    error: { error, errorDescription, status },
  };
}

export function appendOAuthError(
  redirectUri: string,
  state: string | null,
  error: string,
  errorDescription?: string,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("error", error);
  if (errorDescription) {
    url.searchParams.set("error_description", errorDescription);
  }
  if (state) url.searchParams.set("state", state);
  return url.toString();
}

export function appendOAuthCode(
  redirectUri: string,
  code: string,
  state: string,
): string {
  const url = new URL(redirectUri);
  url.searchParams.set("code", code);
  url.searchParams.set("state", state);
  return url.toString();
}

export function hasValidPkceVerifierSyntax(verifier: string): boolean {
  return /^[A-Za-z0-9._~-]{43,128}$/.test(verifier);
}

export function pkceS256Challenge(verifier: string): string {
  return createHash("sha256").update(verifier).digest("base64url");
}

export function verifyPkceChallenge(
  verifier: string,
  challenge: string,
  method: string,
): boolean {
  if (method !== "S256") return false;
  if (!hasValidPkceVerifierSyntax(verifier)) return false;
  return pkceS256Challenge(verifier) === challenge;
}

export function createRefreshToken(): string {
  return `lo1_rt_${randomBytes(32).toString("base64url")}`;
}

export function hashOAuthToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

export async function createMcpAccessToken(
  userId: string,
  scope = MCP_OAUTH_SCOPE,
): Promise<string> {
  return new SignJWT({ scope })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(userId)
    .setAudience(MCP_OAUTH_AUDIENCE)
    .setIssuer(MCP_OAUTH_ISSUER)
    .setIssuedAt()
    .setExpirationTime(`${MCP_ACCESS_TOKEN_TTL_SECONDS}s`)
    .sign(JWT_SECRET);
}

export function getMcpJwtSecret(): Uint8Array {
  return JWT_SECRET;
}
