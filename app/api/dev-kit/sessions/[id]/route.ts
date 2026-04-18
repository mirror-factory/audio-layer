/**
 * Session Detail API  --  GET /api/dev-kit/sessions/[id]
 *
 * Returns a single trace with all its child spans.
 */

import { createClient } from '@supabase/supabase-js';
import { NextRequest, NextResponse } from 'next/server';
import { getTraceWithSpans } from '@/lib/ai-dev-kit/supabase-queries';

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
    const trace = await getTraceWithSpans(supabase, id);

    if (!trace) {
      return NextResponse.json(
        { error: 'Trace not found' },
        { status: 404 },
      );
    }

    return NextResponse.json(trace);
  } catch (err) {
    console.error('[api/dev-kit/sessions/[id]] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch session detail' },
      { status: 500 },
    );
  }
}
