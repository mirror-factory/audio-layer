/**
 * Tools API  --  GET /api/dev-kit/tools
 *
 * Returns the tool registry from the in-memory registry.
 */

import { NextResponse } from 'next/server';
import { TOOL_REGISTRY } from '@/lib/registry';

export async function GET() {
  return NextResponse.json(TOOL_REGISTRY);
}
