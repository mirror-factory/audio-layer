/**
 * AI Logs API — Backend for the observability dashboard
 *
 * Copy to: app/api/ai-logs/route.ts
 * Also create: app/api/ai-logs/stats/route.ts (see below)
 *              app/api/ai-logs/errors/route.ts (see below)
 *
 * All endpoints return JSON. Add auth middleware in production.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getLogs } from '@/lib/ai/telemetry';

// GET /api/ai-logs — List AI call logs with optional filters
export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;

  const limit = parseInt(searchParams.get('limit') ?? '100', 10);
  const logs = getLogs(limit);

  return NextResponse.json(logs);
}
