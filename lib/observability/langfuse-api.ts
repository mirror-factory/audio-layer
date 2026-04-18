/**
 * Langfuse public-API client for the /usage aggregator.
 *
 * Calls `GET /api/public/metrics/daily` with Basic auth
 * (base64 publicKey:secretKey). Scoped by `userId` so each request
 * only sees the current viewer's traces.
 *
 * Null-safe: returns null when either env var is missing, so the
 * aggregator can fall back to the in-memory logger without a crash.
 *
 * Docs: https://langfuse.com/docs/analytics/daily-metrics-api
 */

export interface LangfuseDailyMetric {
  date: string;
  countTraces: number;
  countObservations: number;
  totalCost: number;
  usage: Array<{
    model: string;
    inputUsage: number;
    outputUsage: number;
    totalUsage: number;
    totalCost: number;
    countObservations: number;
    countTraces: number;
  }>;
}

export interface LangfuseDailyMetricsResponse {
  data: LangfuseDailyMetric[];
  meta?: unknown;
}

export interface LangfuseMetricsSummary {
  totalCostUsd: number;
  totalInputTokens: number;
  totalOutputTokens: number;
  totalTokens: number;
  traceCount: number;
  days: LangfuseDailyMetric[];
}

interface FetchOptions {
  userId?: string;
  fromTimestamp?: string; // ISO 8601
  toTimestamp?: string;   // ISO 8601
  limit?: number;
}

function getBaseUrl(): string {
  return process.env.LANGFUSE_BASE_URL ?? "https://cloud.langfuse.com";
}

function getAuthHeader(): string | null {
  const pk = process.env.LANGFUSE_PUBLIC_KEY;
  const sk = process.env.LANGFUSE_SECRET_KEY;
  if (!pk || !sk) return null;
  // Works in Node + edge runtimes (Buffer is polyfilled on edge).
  const token =
    typeof Buffer !== "undefined"
      ? Buffer.from(`${pk}:${sk}`).toString("base64")
      : btoa(`${pk}:${sk}`);
  return `Basic ${token}`;
}

export function isLangfuseConfigured(): boolean {
  return Boolean(
    process.env.LANGFUSE_PUBLIC_KEY && process.env.LANGFUSE_SECRET_KEY,
  );
}

/**
 * Fetch daily metrics from Langfuse. Returns null when auth is
 * missing so the caller can fall back cleanly. Throws on HTTP errors
 * so the caller can log + fall back without swallowing real issues.
 */
export async function fetchLangfuseDailyMetrics(
  opts: FetchOptions = {},
): Promise<LangfuseMetricsSummary | null> {
  const auth = getAuthHeader();
  if (!auth) return null;

  const url = new URL("/api/public/metrics/daily", getBaseUrl());
  if (opts.userId) url.searchParams.set("userId", opts.userId);
  if (opts.fromTimestamp)
    url.searchParams.set("fromTimestamp", opts.fromTimestamp);
  if (opts.toTimestamp)
    url.searchParams.set("toTimestamp", opts.toTimestamp);
  url.searchParams.set("limit", String(opts.limit ?? 100));

  const res = await fetch(url.toString(), {
    headers: {
      Authorization: auth,
      Accept: "application/json",
    },
    // Fresh numbers on every page load; this is a dashboard endpoint.
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(
      `Langfuse metrics request failed: ${res.status} ${res.statusText}`,
    );
  }

  const body = (await res.json()) as LangfuseDailyMetricsResponse;
  return summarizeDailyMetrics(body.data ?? []);
}

export function summarizeDailyMetrics(
  days: LangfuseDailyMetric[],
): LangfuseMetricsSummary {
  let totalCost = 0;
  let totalInput = 0;
  let totalOutput = 0;
  let traceCount = 0;
  for (const d of days) {
    totalCost += d.totalCost ?? 0;
    traceCount += d.countTraces ?? 0;
    for (const u of d.usage ?? []) {
      totalInput += u.inputUsage ?? 0;
      totalOutput += u.outputUsage ?? 0;
    }
  }
  return {
    totalCostUsd: totalCost,
    totalInputTokens: totalInput,
    totalOutputTokens: totalOutput,
    totalTokens: totalInput + totalOutput,
    traceCount,
    days,
  };
}

/** Helper: first-of-this-month timestamp in ISO format. */
export function startOfMonthIso(now: Date = new Date()): string {
  return new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1),
  ).toISOString();
}
