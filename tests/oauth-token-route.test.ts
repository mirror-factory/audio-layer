import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import {
  hashOAuthToken,
  pkceS256Challenge,
} from "@/lib/oauth/mcp-oauth";

const mocks = vi.hoisted(() => ({
  getSupabaseServer: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: mocks.getSupabaseServer,
}));

const tokenRoute = await import("@/app/api/oauth/token/route");

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest("http://localhost:3000/api/oauth/token", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
}

function createSupabaseMock(options: {
  codeRecord?: Record<string, unknown> | null;
  refreshRecord?: Record<string, unknown> | null;
}) {
  const calls = {
    deletedCode: null as string | null,
    insertedRefresh: null as Record<string, unknown> | null,
    revokedRefresh: null as Record<string, unknown> | null,
  };

  const supabase = {
    from(table: string) {
      return {
        select() {
          return this;
        },
        eq(column: string, value: string) {
          void column;
          void value;
          return this;
        },
        async single() {
          if (table === "oauth_codes") {
            return options.codeRecord
              ? { data: options.codeRecord, error: null }
              : { data: null, error: { message: "missing" } };
          }

          if (table === "oauth_refresh_tokens") {
            return options.refreshRecord
              ? { data: options.refreshRecord, error: null }
              : { data: null, error: { message: "missing" } };
          }

          return { data: null, error: { message: "unexpected table" } };
        },
        delete() {
          return {
            async eq(_column: string, value: string) {
              calls.deletedCode = value;
              return { error: null };
            },
          };
        },
        async insert(row: Record<string, unknown>) {
          calls.insertedRefresh = row;
          return { error: null };
        },
        update(row: Record<string, unknown>) {
          return {
            async eq(_column: string, value: string) {
              calls.revokedRefresh = { ...row, token_hash: value };
              return { error: null };
            },
          };
        },
      };
    },
  };

  return { calls, supabase };
}

describe("OAuth token route", () => {
  beforeEach(() => {
    mocks.getSupabaseServer.mockReset();
  });

  it("requires PKCE verifier for authorization-code exchange", async () => {
    const res = await tokenRoute.POST(
      jsonRequest({
        code: "code_123",
        grant_type: "authorization_code",
        redirect_uri: "https://claude.ai/callback",
      }),
    );

    expect(res.status).toBe(400);
    await expect(res.json()).resolves.toMatchObject({
      error: "invalid_grant",
    });
    expect(mocks.getSupabaseServer).not.toHaveBeenCalled();
  });

  it("exchanges a PKCE-bound code for access and refresh tokens", async () => {
    const verifier = "a".repeat(43);
    const { calls, supabase } = createSupabaseMock({
      codeRecord: {
        client_id: "claude",
        code_challenge: pkceS256Challenge(verifier),
        code_challenge_method: "S256",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        redirect_uri: "https://claude.ai/callback",
        scope: "mcp:tools",
        user_id: "user_123",
      },
    });
    mocks.getSupabaseServer.mockReturnValue(supabase);

    const res = await tokenRoute.POST(
      jsonRequest({
        client_id: "claude",
        code: "code_123",
        code_verifier: verifier,
        grant_type: "authorization_code",
        redirect_uri: "https://claude.ai/callback",
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body).toMatchObject({
      expires_in: 3600,
      scope: "mcp:tools",
      token_type: "Bearer",
    });
    expect(body.access_token).toMatch(/\./);
    expect(body.refresh_token).toMatch(/^lo1_rt_/);
    expect(calls.deletedCode).toBe("code_123");
    expect(calls.insertedRefresh?.token_hash).toBe(
      hashOAuthToken(body.refresh_token),
    );
  });

  it("rotates refresh tokens", async () => {
    const refreshToken = "lo1_rt_original";
    const { calls, supabase } = createSupabaseMock({
      refreshRecord: {
        client_id: "claude",
        expires_at: new Date(Date.now() + 60_000).toISOString(),
        revoked_at: null,
        scope: "mcp:tools",
        user_id: "user_123",
      },
    });
    mocks.getSupabaseServer.mockReturnValue(supabase);

    const res = await tokenRoute.POST(
      jsonRequest({
        client_id: "claude",
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
    );
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.refresh_token).toMatch(/^lo1_rt_/);
    expect(body.refresh_token).not.toBe(refreshToken);
    expect(calls.revokedRefresh?.token_hash).toBe(hashOAuthToken(refreshToken));
    expect(calls.insertedRefresh?.token_hash).toBe(
      hashOAuthToken(body.refresh_token),
    );
  });
});
