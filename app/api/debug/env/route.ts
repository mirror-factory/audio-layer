/**
 * GET /api/debug/env — check which env vars are available at runtime.
 * Shows presence (not values) of each expected env var.
 * Safe to expose since it only shows boolean flags.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";

const EXPECTED = [
  "SUPABASE_URL",
  "SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "AI_GATEWAY_API_KEY",
  "ASSEMBLYAI_API_KEY",
  "STRIPE_SECRET_KEY",
  "LANGFUSE_PUBLIC_KEY",
  "RESEND_API_KEY",
] as const;

export async function GET() {
  const result: Record<string, boolean> = {};
  for (const key of EXPECTED) {
    result[key] = Boolean(process.env[key]);
  }
  return NextResponse.json(result);
}
