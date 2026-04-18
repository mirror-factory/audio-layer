/**
 * Eval Run Detail API  --  GET /api/dev-kit/evals/[id]
 *
 * Returns a single eval run with all its per-case results.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getEvalRunById } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const { id } = await params;
    const run = await getEvalRunById(supabase, id);

    if (!run) {
      return NextResponse.json(
        { error: 'Eval run not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(run);
  } catch (err) {
    console.error('[api/dev-kit/evals/[id]] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch eval run detail' },
      { status: 500 },
    );
  }
}
