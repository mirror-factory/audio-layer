/**
 * Deployments API  --  GET /api/dev-kit/deployments
 *
 * Returns deployment snapshots ordered by creation date (newest first).
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getDeployments } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const deployments = await getDeployments(supabase);
    return NextResponse.json(deployments);
  } catch (err) {
    console.error('[api/dev-kit/deployments] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch deployments' },
      { status: 500 },
    );
  }
}
