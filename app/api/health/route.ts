/**
 * GET /api/health -- per-dependency liveness.
 *
 * Returns a structured status object so you can tell at a glance which
 * external services are actually reachable. The endpoint itself is
 * dependency-free: it never throws, and it ships a sensible default for
 * dependencies the project hasn't configured.
 *
 * Status values:
 *   "ok"          reachable and authenticated
 *   "degraded"    reachable but missing credentials / limited functionality
 *   "down"        tried to reach and failed
 *   "not-configured"  this dependency isn't expected to be present
 */

import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/with-route';
import { trackedFetch } from '@/lib/integration-usage';

type DepStatus = 'ok' | 'degraded' | 'down' | 'not-configured';

interface DepResult {
  status: DepStatus;
  detail?: string;
  latencyMs?: number;
}

async function checkSupabase(): Promise<DepResult> {
  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.SUPABASE_ANON_KEY;
  if (!url || !key) return { status: 'not-configured' };

  const started = Date.now();
  try {
    const res = await trackedFetch(
      `${url}/rest/v1/`,
      {
        headers: { apikey: key, Authorization: `Bearer ${key}` },
        signal: AbortSignal.timeout(3_000),
      },
      {
        integrationId: 'supabase',
        label: 'Supabase',
        route: '/api/health',
        operation: 'health.rest-root',
      },
    );
    const latencyMs = Date.now() - started;
    return res.ok
      ? { status: 'ok', latencyMs }
      : { status: 'degraded', detail: `HTTP ${res.status}`, latencyMs };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

async function checkLangfuse(): Promise<DepResult> {
  const pk = process.env.LANGFUSE_PUBLIC_KEY;
  const sk = process.env.LANGFUSE_SECRET_KEY;
  const base = process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com';
  if (!pk || !sk) return { status: 'not-configured' };

  const started = Date.now();
  try {
    const res = await trackedFetch(
      `${base}/api/public/health`,
      { signal: AbortSignal.timeout(3_000) },
      {
        integrationId: 'langfuse',
        label: 'Langfuse',
        route: '/api/health',
        operation: 'health.public',
      },
    );
    return res.ok
      ? { status: 'ok', latencyMs: Date.now() - started }
      : { status: 'degraded', detail: `HTTP ${res.status}` };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Project-specific vendor checks. Edit this list to include the external
 * APIs your app actually calls; each returns DepResult. Avoid doing real
 * billable calls here -- prefer the vendor's free status / ping endpoints.
 */
async function checkAssemblyAI(): Promise<DepResult> {
  if (!process.env.ASSEMBLYAI_API_KEY) return { status: 'not-configured' };
  const started = Date.now();
  try {
    const res = await trackedFetch(
      'https://api.assemblyai.com/v2/account',
      {
        headers: { Authorization: process.env.ASSEMBLYAI_API_KEY },
        signal: AbortSignal.timeout(3_000),
      },
      {
        integrationId: 'assemblyai',
        label: 'AssemblyAI',
        route: '/api/health',
        operation: 'health.account',
      },
    );
    return res.ok
      ? { status: 'ok', latencyMs: Date.now() - started }
      : { status: 'degraded', detail: `HTTP ${res.status}` };
  } catch (err) {
    return { status: 'down', detail: err instanceof Error ? err.message : String(err) };
  }
}

export const GET = withRoute(async () => {
  const [supabase, langfuse, assemblyai] = await Promise.all([
    checkSupabase(),
    checkLangfuse(),
    checkAssemblyAI(),
  ]);

  const dependencies = { supabase, langfuse, assemblyai };
  const overall: DepStatus = Object.values(dependencies).some(d => d.status === 'down')
    ? 'down'
    : Object.values(dependencies).some(d => d.status === 'degraded')
    ? 'degraded'
    : 'ok';

  return NextResponse.json(
    { status: overall, ts: new Date().toISOString(), dependencies },
    { status: overall === 'down' ? 503 : 200 },
  );
});
