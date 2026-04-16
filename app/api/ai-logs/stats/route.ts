/**
 * AI Logs Stats API — Aggregated statistics for the observability dashboard
 *
 * Copy to: app/api/ai-logs/stats/route.ts
 *
 * Returns: totalCalls, totalCost, totalTokens, avgTTFT, p95TTFT,
 *          errorRate, abortRate, modelBreakdown, costByDay, callsByDay,
 *          errorsByDay, toolFrequency, sessions
 */

import { NextRequest, NextResponse } from 'next/server';
import { getStats } from '@/lib/ai/telemetry';

// GET /api/ai-logs/stats — Aggregated statistics
export async function GET(_request: NextRequest) {
  const stats = getStats();
  return NextResponse.json(stats);
}
