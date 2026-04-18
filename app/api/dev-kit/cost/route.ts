/**
 * Cost API  --  GET /api/dev-kit/cost
 *
 * Returns cost summary for the specified period and per-model breakdown.
 *
 * Query params:
 *   ?period=day|week|month  (default: month)
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getCostSummary, getCostByModel } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const { searchParams } = request.nextUrl;
    const period = (searchParams.get('period') ?? 'month') as 'day' | 'week' | 'month';

    const [summary, byModel] = await Promise.all([
      getCostSummary(supabase, { period }),
      getCostByModel(supabase),
    ]);

    return NextResponse.json({ summary, byModel });
  } catch (err) {
    console.error('[api/dev-kit/cost] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch cost data' },
      { status: 500 },
    );
  }
}
