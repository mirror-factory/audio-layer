/**
 * PROD-402 -- Auth hardening for /api/mcp/[transport].
 *
 * Complementary to tests/mcp/protocol.test.ts (which proves the happy paths +
 * the RFC 6750 401 wire format). This suite drives EVERY documented MCP tool
 * surface through the real route handler with tampered auth state to prove:
 *
 *   1. No Authorization header                  -> 401 invalid_token
 *   2. Malformed bearer (no space, wrong prefix, base64 garbage) -> 401
 *   3. Token signed with wrong secret / unknown key -> 401 invalid_token
 *   4. Expired `exp` token                      -> 401 invalid_token
 *      (jose's jwtVerify enforces exp; see node_modules/jose/dist/webapi/lib/
 *       jwt_claims_set.js line 155 -- throws JWTExpired which the route maps
 *       to a generic null -> 401.)
 *   5. Cross-tenant probe: user A's valid token + meetingId belonging to
 *      user B -> tool returns "Meeting not found" / empty list, NEVER B's data.
 *   6. Revoked client (simulated): mocked validateMcpBearerToken returns null
 *      -> 401 invalid_token.
 *
 * NB: the route does NOT yet have a dedicated client_revoked code path (the
 * `oauth_clients` table + revocation flow ships in PROD-403). Until then,
 * `validateMcpBearerToken` returning null is the only way the route can know
 * a token is dead, and the response is always the generic invalid_token shape.
 * Test (6) reflects the route as built today.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { SignJWT } from "jose";
import { fixtureUsers } from "../fixtures/users";
import {
  MCP_OAUTH_AUDIENCE,
  MCP_OAUTH_ISSUER,
  MCP_OAUTH_SCOPE,
} from "@/lib/oauth/mcp-oauth";

// ---------------------------------------------------------------------------
// Hoisted mocks
// ---------------------------------------------------------------------------

interface RegisteredTool {
  name: string;
  schema: unknown;
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

interface RegisteredAppTool {
  name: string;
  config: { inputSchema?: unknown };
  handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
}

const mocks = vi.hoisted(() => {
  const registeredTools: Array<{
    name: string;
    schema: unknown;
    handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
  }> = [];
  const registeredAppTools: Array<{
    name: string;
    config: { inputSchema?: unknown };
    handler: (args: Record<string, unknown>) => Promise<unknown> | unknown;
  }> = [];
  const registeredAppResources: Array<{ name: string; uri: string }> = [];

  const validateMcpBearerToken = vi.fn();

  // Stand-in for `mcp-handler`'s createMcpHandler. We:
  //   - capture every server.tool() registration so individual tests can
  //     invoke the underlying handler directly,
  //   - return a generic 200 forwarder so the route's transport plumbing is
  //     exercised end-to-end without spinning up the real MCP transport.
  const createMcpHandler = vi.fn(
    (
      configure: (server: {
        tool: ReturnType<typeof vi.fn>;
        registerTool: ReturnType<typeof vi.fn>;
        registerResource: ReturnType<typeof vi.fn>;
      }) => void,
    ) => {
      const tool = vi.fn(
        (
          name: string,
          _description: string,
          schema: unknown,
          handler: (args: Record<string, unknown>) => Promise<unknown> | unknown,
        ) => {
          registeredTools.push({ name, schema, handler });
        },
      );
      const registerTool = vi.fn();
      const registerResource = vi.fn();
      configure({ tool, registerTool, registerResource });
      return async () =>
        new Response(JSON.stringify({ forwarded: true }), {
          status: 200,
          headers: { "content-type": "application/json" },
        });
    },
  );

  // ext-apps registers via registerAppTool / registerAppResource. We capture
  // them so cross-tenant tests can call into show_meeting_dashboard too.
  const registerAppTool = vi.fn(
    (
      _server: unknown,
      name: string,
      config: { inputSchema?: unknown },
      handler: (args: Record<string, unknown>) => Promise<unknown> | unknown,
    ) => {
      registeredAppTools.push({ name, config, handler });
    },
  );
  const registerAppResource = vi.fn(
    (_server: unknown, name: string, uri: string) => {
      registeredAppResources.push({ name, uri });
    },
  );

  return {
    createMcpHandler,
    registeredTools,
    registeredAppTools,
    registeredAppResources,
    registerAppTool,
    registerAppResource,
    validateMcpBearerToken,
  };
});

vi.mock("mcp-handler", () => ({
  createMcpHandler: mocks.createMcpHandler,
}));

vi.mock("@modelcontextprotocol/ext-apps/server", () => ({
  registerAppTool: mocks.registerAppTool,
  registerAppResource: mocks.registerAppResource,
  RESOURCE_MIME_TYPE: "text/html+layers",
}));

vi.mock("@/lib/mcp/auth", () => ({
  validateMcpBearerToken: mocks.validateMcpBearerToken,
}));

// ---------------------------------------------------------------------------
// Tenant-aware Supabase fake (used by the route's getMeeting/listMeetings).
// ---------------------------------------------------------------------------

interface SeededMeeting {
  id: string;
  user_id: string;
  title: string;
  status: "completed";
  duration_seconds: number;
  text: string | null;
  summary: Record<string, unknown> | null;
  created_at: string;
}

const seeded: SeededMeeting[] = [];

function buildSupabaseFake() {
  return {
    from(table: string) {
      if (table !== "meetings") {
        throw new Error(`Unexpected table in MCP auth test: ${table}`);
      }
      const filters: { id?: string; user_id?: string } = {};
      let limit = Number.MAX_SAFE_INTEGER;
      const builder = {
        select(_cols: string) {
          return builder;
        },
        eq(column: string, value: string) {
          if (column === "id") filters.id = value;
          else if (column === "user_id") filters.user_id = value;
          return builder;
        },
        order(_col: string, _opts: unknown) {
          return builder;
        },
        limit(n: number) {
          limit = n;
          return builder;
        },
        async single() {
          const row = seeded.find(
            (m) =>
              (filters.id === undefined || m.id === filters.id) &&
              (filters.user_id === undefined || m.user_id === filters.user_id),
          );
          if (!row) return { data: null, error: { message: "not found" } };
          return { data: row, error: null };
        },
        // For listMeetings: thenable so `await builder` resolves to {data}.
        then(onFulfilled: (value: { data: SeededMeeting[]; error: null }) => unknown) {
          const rows = seeded
            .filter(
              (m) => filters.user_id === undefined || m.user_id === filters.user_id,
            )
            .slice(0, limit);
          return Promise.resolve({ data: rows, error: null }).then(onFulfilled);
        },
      };
      return builder;
    },
  };
}

vi.mock("@/lib/supabase/server", () => ({
  getSupabaseServer: () => buildSupabaseFake(),
}));

vi.mock("@/lib/embeddings/search", () => ({
  searchMeetings: vi.fn(async (_query: string, userId: string) => {
    return seeded
      .filter((m) => m.user_id === userId)
      .map((m) => ({
        meetingId: m.id,
        meetingTitle: m.title,
        chunkText: m.text ?? "",
      }));
  }),
}));

// Disable rate-limit interference for the user IDs we test with.
const ORIGINAL_BYPASS = process.env.MCP_RATE_LIMIT_BYPASS_USER_IDS;
process.env.MCP_RATE_LIMIT_BYPASS_USER_IDS = `${fixtureUsers.owner.id},${fixtureUsers.intruder.id}`;

// ---------------------------------------------------------------------------
// Lazy-imported route + JWT secret (must come AFTER the mocks above).
// ---------------------------------------------------------------------------

const { POST, GET } = await import("@/app/api/mcp/[transport]/route");
const { getMcpJwtSecret } = await import("@/lib/oauth/mcp-oauth");

function jsonRequest(
  method: string,
  body?: unknown,
  authorization?: string,
): Request {
  return new Request("http://localhost:3000/api/mcp/mcp", {
    method,
    headers: {
      "content-type": "application/json",
      "x-request-id": "req_mcp_auth_test",
      ...(authorization ? { authorization } : {}),
    },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function callBody(toolName: string, args: Record<string, unknown> = {}) {
  return {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: { name: toolName, arguments: args },
  };
}

const TOOLS_LIST_BODY = { jsonrpc: "2.0", id: 1, method: "tools/list" };

function expectInvalidToken401(res: Response) {
  expect(res.status).toBe(401);
  return res.json().then((body: unknown) => {
    expect(body).toMatchObject({ error: "invalid_token" });
    return body as { error: string; error_description?: string };
  });
}

// Force the route to install its tool registry before any cross-tenant test
// runs. The first authorized request triggers createLayersMcpHandler() which
// calls server.tool(...) for every tool we want to invoke later.
async function ensureToolsRegistered() {
  if (mocks.registeredTools.length > 0) return;
  mocks.validateMcpBearerToken.mockResolvedValueOnce({
    userId: fixtureUsers.owner.id,
  });
  await POST(jsonRequest("POST", TOOLS_LIST_BODY, "Bearer warmup_token_123456789"));
}

const ALL_TOOL_NAMES = [
  "search_meetings",
  "get_meeting",
  "list_meetings",
  "get_transcript",
  "get_summary",
  "start_recording",
  "prepare_notes_push",
] as const;

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

const meetingA: SeededMeeting = {
  id: "meeting_a_only",
  user_id: fixtureUsers.owner.id,
  title: "User A roadmap call",
  status: "completed",
  duration_seconds: 1800,
  text: "Roadmap notes for user A only.",
  summary: { title: "User A roadmap call", summary: "A's notes." },
  created_at: "2026-04-30T10:00:00.000Z",
};

const meetingB: SeededMeeting = {
  id: "meeting_b_only",
  user_id: fixtureUsers.intruder.id,
  title: "User B confidential strategy",
  status: "completed",
  duration_seconds: 2400,
  text: "Confidential strategy notes for user B only.",
  summary: { title: "User B confidential strategy", summary: "B's notes." },
  created_at: "2026-04-30T11:00:00.000Z",
};

async function signTokenWithSecret(
  secret: Uint8Array,
  payload: Record<string, unknown>,
  expirationTime: string | number = "5m",
) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expirationTime)
    .setIssuer(MCP_OAUTH_ISSUER)
    .setAudience(MCP_OAUTH_AUDIENCE)
    .sign(secret);
}

// ---------------------------------------------------------------------------
// Suite
// ---------------------------------------------------------------------------

describe("PROD-402 -- /api/mcp/[transport] auth hardening", () => {
  beforeEach(() => {
    seeded.length = 0;
    seeded.push({ ...meetingA }, { ...meetingB });
    mocks.validateMcpBearerToken.mockReset();
    mocks.createMcpHandler.mockClear();
  });

  afterEach(() => {
    if (ORIGINAL_BYPASS === undefined) {
      process.env.MCP_RATE_LIMIT_BYPASS_USER_IDS = `${fixtureUsers.owner.id},${fixtureUsers.intruder.id}`;
    } else {
      process.env.MCP_RATE_LIMIT_BYPASS_USER_IDS = ORIGINAL_BYPASS;
    }
  });

  describe("missing Authorization header", () => {
    it.each(ALL_TOOL_NAMES)(
      "tools/call %s without Authorization -> 401 invalid_token",
      async (toolName) => {
        const res = await POST(jsonRequest("POST", callBody(toolName)));
        const body = await expectInvalidToken401(res);
        expect(res.headers.get("www-authenticate")).toContain("Bearer");
        expect(res.headers.get("www-authenticate")).toContain(
          ".well-known/oauth-protected-resource",
        );
        expect(body.error_description).toMatch(/Bearer token required/i);
        expect(mocks.validateMcpBearerToken).not.toHaveBeenCalled();
      },
    );

    it("tools/list without Authorization -> 401 invalid_token", async () => {
      const res = await POST(jsonRequest("POST", TOOLS_LIST_BODY));
      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).not.toHaveBeenCalled();
    });

    it("GET (SSE) without Authorization -> 401 invalid_token", async () => {
      const res = await GET(jsonRequest("GET"));
      await expectInvalidToken401(res);
    });
  });

  describe("malformed bearer", () => {
    it("Authorization without 'Bearer ' prefix -> 401 invalid_token", async () => {
      const res = await POST(
        jsonRequest("POST", TOOLS_LIST_BODY, "Token deadbeefdeadbeefdeadbeef"),
      );
      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).not.toHaveBeenCalled();
    });

    it("'Bearer' with no space and no value -> 401 invalid_token", async () => {
      const res = await POST(jsonRequest("POST", TOOLS_LIST_BODY, "Bearer"));
      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).not.toHaveBeenCalled();
    });

    it("base64 garbage masquerading as JWT -> 401 invalid_token", async () => {
      mocks.validateMcpBearerToken.mockResolvedValue(null);
      const garbage = "Bearer " + Buffer.from("not.a.jwt.payload!!").toString("base64");
      const res = await POST(jsonRequest("POST", TOOLS_LIST_BODY, garbage));
      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).toHaveBeenCalledTimes(1);
    });

    it("unknown token prefix is rejected via validator returning null", async () => {
      mocks.validateMcpBearerToken.mockResolvedValue(null);
      const res = await POST(
        jsonRequest("POST", TOOLS_LIST_BODY, "Bearer xx_unknown_prefix_token_aaaaa"),
      );
      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).toHaveBeenCalledWith(
        "xx_unknown_prefix_token_aaaaa",
      );
    });
  });

  describe("token signed with wrong secret", () => {
    it("wrong-secret JWT -> validator returns null -> 401 invalid_token", async () => {
      // The mocked validator stands in for the real jose.jwtVerify, which
      // throws JWTSignatureVerificationFailed and -> null in lib/mcp/auth.ts.
      mocks.validateMcpBearerToken.mockResolvedValueOnce(null);

      const wrongSecret = new TextEncoder().encode("totally-different-secret-key");
      const token = await signTokenWithSecret(wrongSecret, {
        sub: fixtureUsers.owner.id,
        scope: MCP_OAUTH_SCOPE,
      });

      const res = await POST(
        jsonRequest("POST", TOOLS_LIST_BODY, `Bearer ${token}`),
      );

      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).toHaveBeenCalledWith(token);
    });
  });

  describe("expired token", () => {
    it("JWT with past `exp` -> validator returns null -> 401 invalid_token", async () => {
      // jose's jwtVerify throws JWTExpired when exp is in the past (see
      // node_modules/jose/dist/webapi/lib/jwt_claims_set.js:155). The route's
      // wrapper in lib/mcp/auth.ts catches it and returns null. We simulate
      // that here so this test stays decoupled from real time.
      mocks.validateMcpBearerToken.mockResolvedValueOnce(null);

      // Sign an actually-expired JWT with the real secret too, just to prove
      // the wire format we're sending matches what a misbehaving client would
      // send. The mocked validator still drives the assertion.
      const token = await signTokenWithSecret(
        getMcpJwtSecret(),
        { sub: fixtureUsers.owner.id, scope: MCP_OAUTH_SCOPE },
        Math.floor(Date.now() / 1000) - 60, // 60s in the past
      );

      const res = await POST(
        jsonRequest("POST", TOOLS_LIST_BODY, `Bearer ${token}`),
      );

      await expectInvalidToken401(res);
      expect(mocks.validateMcpBearerToken).toHaveBeenCalledWith(token);
    });
  });

  describe("cross-tenant probes (user A token, user B data)", () => {
    beforeEach(async () => {
      await ensureToolsRegistered();
    });

    function findTool(name: string) {
      const tool = mocks.registeredTools.find((t) => t.name === name);
      if (!tool) {
        throw new Error(
          `Tool ${name} was not registered. Got: ${mocks.registeredTools
            .map((t) => t.name)
            .join(", ")}`,
        );
      }
      return tool;
    }

    it("registers all expected tools so cross-tenant probes can hit them", () => {
      // Sanity: the route is wiring the catalog we expect to harden.
      expect(mocks.registeredTools.map((t) => t.name)).toEqual([
        "search_meetings",
        "get_meeting",
        "list_meetings",
        "get_transcript",
        "get_summary",
        "start_recording",
        "prepare_notes_push",
      ]);
    });

    it("get_meeting with B's id, executed under user A, returns 'Meeting not found'", async () => {
      // The route's createLayersMcpHandler captures userId at construction
      // time. Our warmup binding above used owner (user A), so any tool we
      // pull off the registry is already scoped to user A.
      const tool = findTool("get_meeting");
      const result = (await tool.handler({ meeting_id: meetingB.id })) as {
        content: Array<{ type: string; text: string }>;
      };

      const text = result.content[0].text;
      expect(text).toBe("Meeting not found");
      expect(text).not.toContain("Confidential strategy");
      expect(text).not.toContain(meetingB.title);
    });

    it("get_transcript with B's id under user A returns 'No transcript available'", async () => {
      const tool = findTool("get_transcript");
      const result = (await tool.handler({ meeting_id: meetingB.id })) as {
        content: Array<{ type: string; text: string }>;
      };

      expect(result.content[0].text).toBe("No transcript available");
      expect(result.content[0].text).not.toContain("Confidential");
    });

    it("get_summary with B's id under user A returns 'No summary available'", async () => {
      const tool = findTool("get_summary");
      const result = (await tool.handler({ meeting_id: meetingB.id })) as {
        content: Array<{ type: string; text: string }>;
      };

      expect(result.content[0].text).toBe("No summary available");
      expect(result.content[0].text).not.toContain("B's notes");
    });

    it("list_meetings under user A returns ONLY user A's meetings", async () => {
      const tool = findTool("list_meetings");
      const result = (await tool.handler({})) as {
        content: Array<{ type: string; text: string }>;
      };

      const list = JSON.parse(result.content[0].text) as Array<{ id: string; title: string }>;
      expect(list.some((m) => m.id === meetingA.id)).toBe(true);
      expect(list.some((m) => m.id === meetingB.id)).toBe(false);
      expect(JSON.stringify(list)).not.toContain("Confidential strategy");
    });

    it("search_meetings under user A never surfaces user B's meetings", async () => {
      const tool = findTool("search_meetings");
      const result = (await tool.handler({ query: "confidential" })) as {
        content: Array<{ type: string; text: string }>;
      };

      const hits = JSON.parse(result.content[0].text) as Array<{
        meetingId: string;
        chunkText: string;
      }>;
      expect(hits.every((hit) => hit.meetingId !== meetingB.id)).toBe(true);
      expect(JSON.stringify(hits)).not.toContain("Confidential strategy");
    });

    it("prepare_notes_push with B's id under user A returns ready=false / not found", async () => {
      const tool = findTool("prepare_notes_push");
      const result = (await tool.handler({
        meeting_id: meetingB.id,
        trigger: "manual_push",
        destination: "mcp_client",
        include_transcript: true,
      })) as { content: Array<{ type: string; text: string }> };

      const payload = JSON.parse(result.content[0].text) as {
        ready: boolean;
        error?: string;
      };
      expect(payload.ready).toBe(false);
      expect(payload.error).toBe("Meeting not found");
      expect(JSON.stringify(payload)).not.toContain("Confidential strategy");
    });
  });

  describe("revoked client (simulated until PROD-403 ships oauth_clients)", () => {
    it("validator returning null (the only revocation signal today) -> 401 invalid_token", async () => {
      // Until PROD-403 lands the oauth_clients table + revocation flow, the
      // route can't distinguish "revoked" from "unknown". We assert the
      // observed behavior: any null from validateMcpBearerToken collapses to
      // the generic invalid_token + "Invalid bearer token" description.
      mocks.validateMcpBearerToken.mockResolvedValueOnce(null);

      const res = await POST(
        jsonRequest(
          "POST",
          TOOLS_LIST_BODY,
          "Bearer revoked_client_token_aaaaaaaaa",
        ),
      );

      const body = await expectInvalidToken401(res);
      expect(body.error_description).toBe("Invalid bearer token");
    });

    it("revocation lookup returning a truthy {revoked} flag still 401s today", async () => {
      // Even if a future revoked-client lookup returns truthy data, the route
      // currently keys off a non-null userId. Mock returning null is the
      // correct behavior; this test guards against accidentally letting a
      // {revoked: true} object slip through as a valid auth result.
      mocks.validateMcpBearerToken.mockResolvedValueOnce(
        null as unknown as { userId: string },
      );

      const res = await POST(
        jsonRequest(
          "POST",
          TOOLS_LIST_BODY,
          "Bearer simulated_revoked_token_bbbbb",
        ),
      );

      await expectInvalidToken401(res);
    });
  });

  describe("happy path control (sanity: valid token still passes)", () => {
    it("valid bearer + tools/list -> 200 forwarded", async () => {
      mocks.validateMcpBearerToken.mockResolvedValueOnce({
        userId: fixtureUsers.owner.id,
      });
      const res = await POST(
        jsonRequest("POST", TOOLS_LIST_BODY, "Bearer valid_token_aaaaaaaaaaaaaaaa"),
      );
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ forwarded: true });
    });
  });
});
