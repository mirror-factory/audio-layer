/**
 * Connectors API  --  GET /api/dev-kit/connectors
 *
 * Returns all connector health statuses.
 */

import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';
import { getConnectorStatuses } from '@/lib/ai-dev-kit/supabase-queries';

export async function GET() {
  try {
    const supabase = createClient(
      process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || '',
      process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
    );

    const connectors = await getConnectorStatuses(supabase);
    return NextResponse.json(connectors);
  } catch (err) {
    console.error('[api/dev-kit/connectors] Error:', err);
    return NextResponse.json(
      { error: 'Failed to fetch connector statuses' },
      { status: 500 },
    );
  }
}
