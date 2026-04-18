/**
 * Tools API  --  GET /api/dev-kit/tools
 *
 * Returns the full tool registry from Supabase.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getToolRegistry } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const tools = await getToolRegistry(supabase);
    return NextResponse.json(tools);
  } catch (err) {
    console.error('[api/dev-kit/tools] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch tool registry' },
      { status: 500 },
    );
  }
}
