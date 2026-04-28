export const runtime = "nodejs";
export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { withRoute } from "@/lib/with-route";
import { withExternalCall } from "@/lib/with-external";

interface GatewayModel {
  id: string;
  object: string;
  created?: number;
  owned_by?: string;
}

interface CacheEntry {
  data: Record<string, GatewayModel[]>;
  expiresAt: number;
}

let cache: CacheEntry | null = null;
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

const ALLOWED_PROVIDERS = ["anthropic", "openai", "google"];
const EXCLUDED_PATTERNS = [
  /image/i,
  /codex/i,
  /instruct/i,
  /search/i,
  /tts/i,
  /embedding/i,
  /dall-e/i,
  /whisper/i,
];

const STATIC_FALLBACK: Record<string, GatewayModel[]> = {
  anthropic: [
    { id: "anthropic/claude-sonnet-4-6", object: "model" },
    { id: "anthropic/claude-haiku-4-5", object: "model" },
    { id: "anthropic/claude-opus-4-7", object: "model" },
  ],
  openai: [
    { id: "openai/gpt-5.4", object: "model" },
    { id: "openai/gpt-5.4-mini", object: "model" },
    { id: "openai/gpt-5.4-nano", object: "model" },
  ],
  google: [
    { id: "google/gemini-2.5-pro", object: "model" },
    { id: "google/gemini-2.5-flash", object: "model" },
    { id: "google/gemini-2.5-flash-lite", object: "model" },
  ],
};

function isExcluded(id: string): boolean {
  return EXCLUDED_PATTERNS.some((pat) => pat.test(id));
}

function getProvider(id: string): string | null {
  const slash = id.indexOf("/");
  if (slash < 0) return null;
  const provider = id.slice(0, slash);
  return ALLOWED_PROVIDERS.includes(provider) ? provider : null;
}

export const GET = withRoute(async (req, ctx) => {
  // Return cache if fresh
  if (cache && Date.now() < cache.expiresAt) {
    return NextResponse.json(cache.data);
  }

  if (!process.env.AI_GATEWAY_API_KEY && !process.env.VERCEL_OIDC_TOKEN) {
    return NextResponse.json(STATIC_FALLBACK);
  }

  try {
    const response = await withExternalCall(
      { vendor: "vercel", operation: "gateway.models", requestId: ctx.requestId },
      () => fetch("https://ai-gateway.vercel.sh/v1/models"),
    );

    if (!response.ok) {
      throw new Error(`Gateway returned ${response.status}`);
    }

    const json = (await response.json()) as { data?: GatewayModel[] };
    const models = json.data ?? [];

    // Group by provider, filter, take top 3
    const grouped: Record<string, GatewayModel[]> = {};

    for (const model of models) {
      if (isExcluded(model.id)) continue;
      const provider = getProvider(model.id);
      if (!provider) continue;
      if (!grouped[provider]) grouped[provider] = [];
      grouped[provider].push(model);
    }

    // Sort by created (newest first) and take top 3 per provider
    const result: Record<string, GatewayModel[]> = {};
    for (const provider of ALLOWED_PROVIDERS) {
      const providerModels = grouped[provider] ?? [];
      providerModels.sort((a, b) => (b.created ?? 0) - (a.created ?? 0));
      result[provider] = providerModels.slice(0, 3);
    }

    // Cache
    cache = { data: result, expiresAt: Date.now() + CACHE_TTL_MS };

    return NextResponse.json(result);
  } catch {
    // Return static fallback on error
    return NextResponse.json(STATIC_FALLBACK);
  }
});
