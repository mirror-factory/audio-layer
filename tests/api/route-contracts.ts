export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export type ApiAuthMode =
  | "public"
  | "user"
  | "dev-kit"
  | "service"
  | "webhook"
  | "oauth"
  | "mcp-bearer";

export interface RouteSmokeCase {
  readonly body?: unknown;
  readonly headers?: Readonly<Record<string, string>>;
  readonly expectStatuses: readonly number[];
  readonly assertJson?: boolean;
  readonly requiresRequestId?: boolean;
  readonly skipReason?: string;
}

export interface ApiRouteContract {
  readonly route: string;
  readonly file: string;
  readonly smokePath: string;
  readonly methods: readonly HttpMethod[];
  readonly auth: ApiAuthMode;
  readonly assertJson: boolean;
  readonly requiresRequestId: boolean;
  readonly defaultExpectStatuses: readonly number[];
  readonly smoke?: Partial<Record<HttpMethod, RouteSmokeCase>>;
  readonly notes?: string;
}

const okOrUnavailable = [200, 401, 403, 404, 503] as const;
const badRequestOrUnavailable = [200, 202, 400, 401, 402, 403, 404, 413, 422, 502, 503] as const;

export const apiRouteContracts = [
  route("/api/ai-logs/errors", "app/api/ai-logs/errors/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/ai-logs", "app/api/ai-logs/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/ai-logs/stats", "app/api/ai-logs/stats/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/control-plane/evidence-export", "app/api/control-plane/evidence-export/route.ts", ["GET"], "dev-kit", false, [200, 403, 404, 503], undefined, "/api/control-plane/evidence-export", false, "Successful response is a gzip evidence archive."),
  route("/api/control-plane", "app/api/control-plane/route.ts", ["GET", "POST"], "dev-kit", false, [200, 403, 404, 503], {
    GET: { expectStatuses: okOrUnavailable },
    POST: { body: {}, expectStatuses: [200, 400, 403, 404, 503] },
  }),
  route("/api/admin/pricing/activate", "app/api/admin/pricing/activate/route.ts", ["POST"], "dev-kit", false, badRequestOrUnavailable, {
    POST: { body: {}, expectStatuses: [400, 401, 403] },
  }),
  route("/api/admin/pricing", "app/api/admin/pricing/route.ts", ["GET", "PUT"], "dev-kit", false, badRequestOrUnavailable, {
    GET: { expectStatuses: okOrUnavailable },
    PUT: { body: {}, expectStatuses: [400, 401, 403] },
  }),
  route("/api/auth/api-key", "app/api/auth/api-key/route.ts", ["GET", "POST", "DELETE"], "user", true, badRequestOrUnavailable, {
    POST: { expectStatuses: [200, 401, 403, 503], skipReason: "mutates the caller's API key" },
    DELETE: { expectStatuses: [200, 401, 403, 503], skipReason: "revokes the caller's API key" },
  }),
  route("/api/auth/send-email", "app/api/auth/send-email/route.ts", ["POST"], "public", true, badRequestOrUnavailable, {
    POST: { body: { email: "person@example.com" }, expectStatuses: [200, 400, 429, 503] },
  }),
  route("/api/calendar/callback/[provider]", "app/api/calendar/callback/[provider]/route.ts", ["GET"], "oauth", false, [302, 307, 308], undefined, "/api/calendar/callback/google"),
  route("/api/calendar/connect/[provider]", "app/api/calendar/connect/[provider]/route.ts", ["GET"], "user", false, [302, 307, 308], undefined, "/api/calendar/connect/google"),
  route("/api/calendar/disconnect/[provider]", "app/api/calendar/disconnect/[provider]/route.ts", ["POST"], "user", true, [200, 400, 401, 403, 500, 503], {
    POST: { expectStatuses: [400, 401, 403, 503], skipReason: "disconnects a user calendar connection" },
  }, "/api/calendar/disconnect/google"),
  route("/api/calendar/upcoming", "app/api/calendar/upcoming/route.ts", ["GET"], "user", true, [200, 401, 403, 503]),
  route("/api/chat", "app/api/chat/route.ts", ["POST"], "user", true, badRequestOrUnavailable, {
    POST: { body: { messages: [] }, expectStatuses: [200, 400, 401, 503] },
  }),
  route("/api/dev-kit/config/[name]", "app/api/dev-kit/config/[name]/route.ts", ["POST"], "dev-kit", false, badRequestOrUnavailable, {
    POST: { body: { yaml: "colors: {}\n" }, expectStatuses: [200, 400, 401, 403, 404] },
  }, "/api/dev-kit/config/design-tokens"),
  route("/api/dev-kit/connectors", "app/api/dev-kit/connectors/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/cost", "app/api/dev-kit/cost/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/coverage", "app/api/dev-kit/coverage/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/dependencies", "app/api/dev-kit/dependencies/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/deployments", "app/api/dev-kit/deployments/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/design-system", "app/api/dev-kit/design-system/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/evals/[id]", "app/api/dev-kit/evals/[id]/route.ts", ["GET"], "dev-kit", false, [200, 403, 404], undefined, "/api/dev-kit/evals/sample"),
  route("/api/dev-kit/evals", "app/api/dev-kit/evals/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/features/[name]", "app/api/dev-kit/features/[name]/route.ts", ["GET"], "dev-kit", false, [200, 403, 404], undefined, "/api/dev-kit/features/sample"),
  route("/api/dev-kit/features", "app/api/dev-kit/features/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/index", "app/api/dev-kit/index/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/logs/unified", "app/api/dev-kit/logs/unified/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/overview", "app/api/dev-kit/overview/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/registries", "app/api/dev-kit/registries/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/regressions", "app/api/dev-kit/regressions/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/runs/[run_id]", "app/api/dev-kit/runs/[run_id]/route.ts", ["GET"], "dev-kit", false, [200, 403, 404], undefined, "/api/dev-kit/runs/sample"),
  route("/api/dev-kit/runs", "app/api/dev-kit/runs/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/sessions/[id]", "app/api/dev-kit/sessions/[id]/route.ts", ["GET"], "dev-kit", false, [200, 403, 404], undefined, "/api/dev-kit/sessions/sample"),
  route("/api/dev-kit/sessions", "app/api/dev-kit/sessions/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/status", "app/api/dev-kit/status/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/dev-kit/tools", "app/api/dev-kit/tools/route.ts", ["GET"], "dev-kit", false, okOrUnavailable),
  route("/api/embeddings/backfill", "app/api/embeddings/backfill/route.ts", ["POST"], "service", true, badRequestOrUnavailable),
  route("/api/health", "app/api/health/route.ts", ["GET"], "public", true, [200, 503]),
  route("/api/mcp/[transport]", "app/api/mcp/[transport]/route.ts", ["GET", "POST", "DELETE"], "mcp-bearer", false, [200, 400, 401, 404, 405], {
    POST: {
      body: { jsonrpc: "2.0", id: 1, method: "initialize", params: {} },
      headers: { accept: "application/json, text/event-stream" },
      expectStatuses: [200, 400, 401, 404],
      assertJson: false,
    },
    DELETE: { expectStatuses: [200, 400, 401, 404, 405], assertJson: false },
  }, "/api/mcp/mcp", false),
  route("/api/meetings/[id]/export", "app/api/meetings/[id]/export/route.ts", ["GET"], "user", true, [200, 401, 404, 503], undefined, "/api/meetings/sample/export", false, "Successful response is a file export."),
  route("/api/meetings/[id]/notes-package", "app/api/meetings/[id]/notes-package/route.ts", ["POST"], "user", true, badRequestOrUnavailable, {
    POST: { body: { destination: "agent_clipboard", trigger: "manual_push", include_transcript: false }, expectStatuses: [200, 400, 401, 404, 503] },
  }, "/api/meetings/sample/notes-package"),
  route("/api/meetings/[id]", "app/api/meetings/[id]/route.ts", ["GET", "DELETE"], "user", true, [200, 401, 404, 503], {
    DELETE: { expectStatuses: [200, 400, 401, 404, 409, 503], skipReason: "deletes empty local draft recordings" },
  }, "/api/meetings/sample"),
  route("/api/meetings", "app/api/meetings/route.ts", ["GET"], "user", true, okOrUnavailable),
  route("/api/models", "app/api/models/route.ts", ["GET"], "public", true, [200]),
  route("/api/oauth/authorize", "app/api/oauth/authorize/route.ts", ["GET"], "oauth", false, [302, 400]),
  route("/api/oauth/callback", "app/api/oauth/callback/route.ts", ["GET"], "oauth", false, [200, 302, 307, 308, 400, 401, 503], undefined, "/api/oauth/callback", false, "Fetch follows the callback redirect to the consent page in smoke tests."),
  route("/api/oauth/consent", "app/api/oauth/consent/route.ts", ["POST"], "oauth", false, [302, 400, 401, 503], {
    POST: { body: {}, expectStatuses: [400, 401, 503] },
  }),
  route("/api/oauth/revoke", "app/api/oauth/revoke/route.ts", ["POST"], "oauth", false, [200, 400, 503], {
    POST: { body: {}, expectStatuses: [400, 503] },
  }),
  route("/api/oauth/token", "app/api/oauth/token/route.ts", ["POST"], "oauth", false, badRequestOrUnavailable),
  route("/api/observability/health", "app/api/observability/health/route.ts", ["GET"], "public", true, [200]),
  route("/api/search", "app/api/search/route.ts", ["POST"], "user", true, badRequestOrUnavailable, {
    POST: { body: { query: "", limit: 5 }, expectStatuses: [400, 401, 503] },
  }),
  route("/api/settings", "app/api/settings/route.ts", ["GET", "PUT"], "public", true, badRequestOrUnavailable),
  route("/api/stripe/checkout", "app/api/stripe/checkout/route.ts", ["POST"], "user", true, badRequestOrUnavailable),
  route("/api/stripe/webhook", "app/api/stripe/webhook/route.ts", ["POST"], "webhook", true, [200, 400, 503]),
  route("/api/transcribe/[id]", "app/api/transcribe/[id]/route.ts", ["GET"], "user", true, [200, 202, 401, 404, 502, 503], undefined, "/api/transcribe/sample"),
  route("/api/transcribe", "app/api/transcribe/route.ts", ["POST"], "user", true, [202, 400, 401, 402, 413, 502, 503]),
  route("/api/transcribe/stream/autosave", "app/api/transcribe/stream/autosave/route.ts", ["POST"], "user", true, badRequestOrUnavailable),
  route("/api/transcribe/stream/finalize", "app/api/transcribe/stream/finalize/route.ts", ["POST"], "user", true, badRequestOrUnavailable),
  route("/api/transcribe/stream/preflight", "app/api/transcribe/stream/preflight/route.ts", ["GET"], "user", true, [200, 401, 403, 503]),
  route("/api/transcribe/stream/token", "app/api/transcribe/stream/token/route.ts", ["POST"], "user", true, badRequestOrUnavailable),
  route("/api/webhooks/deliveries", "app/api/webhooks/deliveries/route.ts", ["GET"], "user", true, [200, 401, 403, 503]),
  route("/api/webhooks", "app/api/webhooks/route.ts", ["GET", "POST", "DELETE"], "user", true, badRequestOrUnavailable),
] as const satisfies readonly ApiRouteContract[];

function route(
  routePath: string,
  file: string,
  methods: readonly HttpMethod[],
  auth: ApiAuthMode,
  requiresRequestId: boolean,
  defaultExpectStatuses: readonly number[],
  smoke?: Partial<Record<HttpMethod, RouteSmokeCase>>,
  smokePath = routePath,
  assertJson = true,
  notes?: string,
): ApiRouteContract {
  return {
    route: routePath,
    file,
    smokePath,
    methods,
    auth,
    assertJson,
    requiresRequestId,
    defaultExpectStatuses,
    smoke,
    notes,
  };
}

export function getRouteSmokeCase(
  contract: ApiRouteContract,
  method: HttpMethod,
): RouteSmokeCase {
  return {
    expectStatuses: contract.defaultExpectStatuses,
    assertJson: contract.assertJson,
    requiresRequestId: contract.requiresRequestId,
    ...contract.smoke?.[method],
  };
}
