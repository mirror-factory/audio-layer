/**
 * Regressions API  --  GET /api/dev-kit/regressions
 *
 * Returns all auto-generated regression tests ordered by creation
 * date (newest first).
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getRegressionTests } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const regressions = await getRegressionTests(supabase);
    return NextResponse.json(regressions);
  } catch (err) {
    console.error('[api/dev-kit/regressions] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch regression tests' },
      { status: 500 },
    );
  }
}
