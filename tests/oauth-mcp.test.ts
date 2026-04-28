import { describe, expect, it } from "vitest";
import {
  MCP_OAUTH_SCOPE,
  hashOAuthToken,
  isAllowedOAuthRedirectUri,
  normalizeMcpScope,
  parseOAuthAuthorizeParams,
  pkceS256Challenge,
  verifyPkceChallenge,
} from "@/lib/oauth/mcp-oauth";

describe("MCP OAuth helpers", () => {
  it("accepts HTTPS and loopback redirect URIs only", () => {
    expect(isAllowedOAuthRedirectUri("https://claude.ai/api/callback")).toBe(true);
    expect(isAllowedOAuthRedirectUri("http://localhost:3000/callback")).toBe(true);
    expect(isAllowedOAuthRedirectUri("http://127.0.0.1:3000/callback")).toBe(true);
    expect(isAllowedOAuthRedirectUri("http://example.com/callback")).toBe(false);
    expect(isAllowedOAuthRedirectUri("https://example.com/callback#token")).toBe(false);
  });

  it("normalizes MCP scope without granting unsupported scopes", () => {
    expect(normalizeMcpScope(null)).toBe(MCP_OAUTH_SCOPE);
    expect(normalizeMcpScope("mcp:tools")).toBe(MCP_OAUTH_SCOPE);
    expect(normalizeMcpScope("openid profile")).toBeNull();
  });

  it("requires PKCE S256 params for authorization", () => {
    const params = new URLSearchParams({
      code_challenge: "challenge",
      code_challenge_method: "S256",
      redirect_uri: "https://claude.ai/api/callback",
      state: "state_123",
    });

    expect(parseOAuthAuthorizeParams(params)).toMatchObject({
      ok: true,
      value: {
        codeChallengeMethod: "S256",
        redirectUri: "https://claude.ai/api/callback",
        scope: MCP_OAUTH_SCOPE,
      },
    });

    params.delete("code_challenge");
    expect(parseOAuthAuthorizeParams(params)).toMatchObject({
      ok: false,
      error: { error: "invalid_request" },
    });
  });

  it("verifies PKCE challenges and rejects malformed verifiers", () => {
    const verifier = "a".repeat(43);
    const challenge = pkceS256Challenge(verifier);

    expect(verifyPkceChallenge(verifier, challenge, "S256")).toBe(true);
    expect(verifyPkceChallenge("short", challenge, "S256")).toBe(false);
    expect(verifyPkceChallenge(verifier, "wrong", "S256")).toBe(false);
    expect(verifyPkceChallenge(verifier, challenge, "plain")).toBe(false);
  });

  it("hashes OAuth tokens deterministically without storing raw values", () => {
    const hash = hashOAuthToken("lo1_rt_secret");

    expect(hash).toHaveLength(64);
    expect(hash).toBe(hashOAuthToken("lo1_rt_secret"));
    expect(hash).not.toContain("lo1_rt_secret");
  });
});
