/**
 * Evaluations API  --  GET /api/dev-kit/evals
 *
 * Returns all eval suites and their most recent runs.
 *
 * Query params:
 *   ?suiteId=<uuid>  -- filter runs to a specific suite
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getEvalSuites, getEvalRuns } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const { searchParams } = request.nextUrl;
    const suiteId = searchParams.get('suiteId') ?? undefined;

    const [suites, runs] = await Promise.all([
      getEvalSuites(supabase),
      getEvalRuns(supabase, suiteId),
    ]);

    return NextResponse.json({ suites, runs });
  } catch (err) {
    console.error('[api/dev-kit/evals] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch evaluations' },
      { status: 500 },
    );
  }
}
