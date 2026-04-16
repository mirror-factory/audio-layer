/**
 * AI Errors API — Error log endpoint for the observability dashboard
 *
 * Copy to: app/api/ai-logs/errors/route.ts
 *
 * Returns error records: source, message, stack, tool, model, metadata
 */

import { NextRequest, NextResponse } from 'next/server';
import { getErrors } from '@/lib/ai/telemetry';

// GET /api/ai-logs/errors — List error records
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = parseInt(searchParams.get('limit') ?? '50', 10);
  const errors = getErrors(limit);

  return NextResponse.json(errors);
}
