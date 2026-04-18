/**
 * Overview API  --  GET /api/dev-kit/overview
 *
 * Returns aggregated dashboard stats: total cost, avg latency,
 * eval pass rate, active tools count, and system health.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getOverviewStats } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET() {
  try {
    // Try Langfuse first (if configured)
    const langfusePublicKey = process.env.LANGFUSE_PUBLIC_KEY;
    const langfuseSecretKey = process.env.LANGFUSE_SECRET_KEY;
    const langfuseBaseUrl = process.env.LANGFUSE_BASE_URL ?? 'https://cloud.langfuse.com';

    if (langfusePublicKey && langfuseSecretKey) {
      try {
        const auth = Buffer.from(`${langfusePublicKey}:${langfuseSecretKey}`).toString('base64');
        const [tracesRes, scoresRes] = await Promise.all([
          fetch(`${langfuseBaseUrl}/api/public/traces?limit=100`, { headers: { Authorization: `Basic ${auth}` } }),
          fetch(`${langfuseBaseUrl}/api/public/scores?limit=100`, { headers: { Authorization: `Basic ${auth}` } }),
        ]);
        if (tracesRes.ok) {
          const traces = await tracesRes.json();
          const traceList = traces.data ?? [];
          const totalCost = traceList.reduce((sum: number, t: any) => sum + (t.totalCost ?? 0), 0);
          const avgLatency = traceList.length > 0
            ? traceList.reduce((sum: number, t: any) => sum + (t.latency ?? 0), 0) / traceList.length
            : 0;
          return NextResponse.json({
            kpis: [
              { label: 'Total Cost', value: `$${totalCost.toFixed(2)}`, trend: 0 },
              { label: 'Avg Latency', value: `${(avgLatency / 1000).toFixed(2)}s`, trend: 0 },
              { label: 'Traces', value: String(traceList.length), trend: 0 },
            ],
            modules: [],
            source: 'langfuse',
          });
        }
      } catch { /* Fall through to Supabase */ }
    }

    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const stats = await getOverviewStats(supabase);
    return NextResponse.json(stats);
  } catch (err) {
    console.error('[api/dev-kit/overview] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch overview stats' },
      { status: 500 },
    );
  }
}
