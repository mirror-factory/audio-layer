/**
 * GET /api/models
 *
 * Fetches available LLM models from the Vercel AI Gateway with live pricing.
 * Caches for 5 minutes to avoid hammering the Gateway on every settings page load.
 */

import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface GatewayModel {
  id: string;
  name: string;
  owned_by: string;
  released?: number;
  context_window?: number;
  pricing?: {
    input?: string;
    output?: string;
  };
}

interface ModelOption {
  value: string;
  label: string;
  price: string;
  provider: string;
}

let cache: { data: ModelOption[]; ts: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/** Providers and model families we want to show as summarization options. */
const WANTED_PROVIDERS = ["anthropic", "openai", "google"];

/** Pick the best 3 from each provider — newest first, then cheapest. */
function pickTopModels(all: GatewayModel[]): ModelOption[] {
  const byProvider: Record<string, GatewayModel[]> = {};

  for (const m of all) {
    const provider = m.id.split("/")[0];
    if (!WANTED_PROVIDERS.includes(provider)) continue;
    // Skip non-language models
    if (m.id.includes("image") || m.id.includes("codex") || m.id.includes("instruct")) continue;
    if (m.id.includes("search") || m.id.includes("tts") || m.id.includes("embedding")) continue;
    if (!m.pricing?.input || !m.pricing?.output) continue;
    byProvider[provider] ??= [];
    byProvider[provider].push(m);
  }

  const result: ModelOption[] = [];

  for (const provider of WANTED_PROVIDERS) {
    const models = byProvider[provider] ?? [];
    // Sort by release date descending (newest first), then cost ascending
    models.sort((a, b) => {
      const relA = a.released ?? 0;
      const relB = b.released ?? 0;
      if (relB !== relA) return relB - relA;
      return parseFloat(a.pricing!.input!) - parseFloat(b.pricing!.input!);
    });
    // Take up to 3 per provider
    for (const m of models.slice(0, 3)) {
      const inCost = (parseFloat(m.pricing!.input!) * 1e6).toFixed(2);
      const outCost = (parseFloat(m.pricing!.output!) * 1e6).toFixed(2);
      result.push({
        value: m.id,
        label: m.name,
        price: `$${inCost} / $${outCost} per 1M tokens`,
        provider: m.owned_by,
      });
    }
  }

  // Sort final list: cheapest first across all providers
  result.sort((a, b) => {
    const costA = parseFloat(a.price.replace(/[^0-9.]/g, ""));
    const costB = parseFloat(b.price.replace(/[^0-9.]/g, ""));
    return costA - costB;
  });

  return result;
}

export async function GET(): Promise<NextResponse> {
  if (cache && Date.now() - cache.ts < CACHE_TTL) {
    return NextResponse.json(cache.data);
  }

  try {
    const res = await fetch("https://ai-gateway.vercel.sh/v1/models", {
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`Gateway returned ${res.status}`);
    const { data } = (await res.json()) as { data: GatewayModel[] };
    const models = pickTopModels(data);
    cache = { data: models, ts: Date.now() };
    return NextResponse.json(models);
  } catch (err) {
    console.error("Failed to fetch Gateway models", err);
    // Return a static fallback — newest models as of April 2026
    return NextResponse.json([
      { value: "openai/gpt-5.4-nano", label: "GPT-5.4 Nano", price: "$0.20 / $1.25 per 1M tokens", provider: "openai" },
      { value: "google/gemini-3.1-flash-lite-preview", label: "Gemini 3.1 Flash Lite Preview", price: "$0.25 / $1.50 per 1M tokens", provider: "google" },
      { value: "openai/gpt-5.4-mini", label: "GPT-5.4 Mini", price: "$0.75 / $4.50 per 1M tokens", provider: "openai" },
      { value: "google/gemini-3-flash", label: "Gemini 3 Flash", price: "$0.50 / $3.00 per 1M tokens", provider: "google" },
      { value: "anthropic/claude-haiku-4.5", label: "Claude Haiku 4.5", price: "$1.00 / $5.00 per 1M tokens", provider: "anthropic" },
      { value: "openai/gpt-5.4", label: "GPT-5.4", price: "$2.50 / $15.00 per 1M tokens", provider: "openai" },
      { value: "google/gemini-3.1-pro-preview", label: "Gemini 3.1 Pro Preview", price: "$2.00 / $12.00 per 1M tokens", provider: "google" },
      { value: "anthropic/claude-sonnet-4.6", label: "Claude Sonnet 4.6", price: "$3.00 / $15.00 per 1M tokens", provider: "anthropic" },
      { value: "anthropic/claude-opus-4.7", label: "Claude Opus 4.7", price: "$5.00 / $25.00 per 1M tokens", provider: "anthropic" },
    ]);
  }
}
