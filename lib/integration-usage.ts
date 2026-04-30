import { appendFileSync, existsSync, mkdirSync, readFileSync } from "fs";
import { dirname, join } from "path";

export interface IntegrationUsageEvent {
  id: string;
  timestamp: string;
  integrationId: string;
  label: string;
  quantity: number;
  unit: string;
  unitCostUsd: number | null;
  costUsd: number;
  status: "success" | "error" | "skipped";
  route?: string | null;
  operation?: string | null;
  error?: string | null;
  url?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface IntegrationUsageInput {
  integrationId?: string;
  label?: string;
  quantity?: number;
  unit?: string;
  unitCostUsd?: number | null;
  costUsd?: number;
  status?: IntegrationUsageEvent["status"];
  route?: string | null;
  operation?: string | null;
  error?: string | null;
  url?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
}

export interface TrackedFetchOptions extends IntegrationUsageInput {
  integrationId?: string;
  label?: string;
  operation?: string | null;
}

const USAGE_LOG_PATH = join(process.cwd(), ".ai-starter", "runs", "integration-usage.jsonl");
const MAX_USAGE_EVENTS = 500;

function createId() {
  return `iu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "custom-api";
}

function envKey(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, "_").replace(/^_+|_+$/g, "");
}

function readManifestIntegrations(): Array<{
  id: string;
  label?: string;
  cost?: { estimatedUnitCostUsd?: number | null; unit?: string | null };
  triggerPaths?: string[];
  routes?: string[];
}> {
  const manifestPath = join(process.cwd(), ".ai-starter", "manifests", "integrations.json");
  try {
    if (!existsSync(manifestPath)) return [];
    const parsed = JSON.parse(readFileSync(manifestPath, "utf-8"));
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function urlText(input?: RequestInfo | URL | string | null): string | null {
  if (!input) return null;
  if (typeof input === "string") return input;
  if (input instanceof URL) return input.toString();
  if (typeof Request !== "undefined" && input instanceof Request) return input.url;
  return String(input);
}

function hostFromUrl(input?: string | null): string | null {
  if (!input) return null;
  try {
    return new URL(input).hostname;
  } catch {
    return null;
  }
}

function inferIntegrationId(input: {
  integrationId?: string | null;
  route?: string | null;
  operation?: string | null;
  url?: string | null;
}) {
  if (input.integrationId) return input.integrationId;
  const haystack = [input.route, input.operation, input.url].filter(Boolean).join(" ").toLowerCase();
  const host = hostFromUrl(input.url);
  const known: Array<[string, string]> = [
    ["assemblyai", "assemblyai"],
    ["api.assemblyai.com", "assemblyai"],
    ["resend", "resend"],
    ["api.resend.com", "resend"],
    ["stripe", "stripe"],
    ["api.stripe.com", "stripe"],
    ["supabase", "supabase"],
    ["ai-gateway", "vercel-ai-gateway"],
    ["gateway.ai.vercel.com", "vercel-ai-gateway"],
    ["weather", "weather-api"],
    ["browserbase", "browserbase"],
    ["stagehand", "stagehand"],
    ["agent-browser", "agent-browser"],
    ["expect", "expect-browser"],
    ["firecrawl", "firecrawl"],
    ["replicate", "replicate"],
    ["fal.ai", "fal"],
    ["openai", "openai"],
    ["anthropic", "anthropic"],
    ["gemini", "google-gemini"],
    ["imagen", "google-imagen"],
  ];
  for (const [needle, id] of known) {
    if (haystack.includes(needle)) return id;
  }
  if (host) return slugify(host.replace(/^api\./, ""));
  return "custom-api-routes";
}

function costFromEnv(integrationId: string, unit: string): number | null {
  const keys = [
    `AI_STARTER_COST_${envKey(integrationId)}_${envKey(unit)}_USD`,
    `AI_STARTER_COST_${envKey(integrationId)}_USD`,
  ];
  for (const key of keys) {
    const raw = process.env[key];
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) return value;
  }
  return null;
}

function costFromManifest(integrationId: string): number | null {
  const integration = readManifestIntegrations().find(item => item.id === integrationId);
  const value = integration?.cost?.estimatedUnitCostUsd;
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function labelFromManifest(integrationId: string): string {
  return readManifestIntegrations().find(item => item.id === integrationId)?.label ?? integrationId;
}

function normalizeUsage(input: IntegrationUsageInput): IntegrationUsageEvent {
  const integrationId = inferIntegrationId(input);
  const quantity = input.quantity ?? 1;
  const unitCostUsd = input.unitCostUsd ?? null;
  const unit = input.unit ?? "request";
  const inferredUnitCost = unitCostUsd ?? costFromEnv(integrationId, unit) ?? costFromManifest(integrationId);
  const costUsd = input.costUsd ?? (inferredUnitCost === null ? 0 : quantity * inferredUnitCost);

  return {
    id: createId(),
    timestamp: new Date().toISOString(),
    integrationId,
    label: input.label ?? labelFromManifest(integrationId),
    quantity,
    unit,
    unitCostUsd: inferredUnitCost,
    costUsd,
    status: input.status ?? "success",
    route: input.route ?? null,
    operation: input.operation ?? null,
    error: input.error ?? null,
    url: input.url ?? null,
    metadata: {
      ...(input.url ? { url: input.url, host: hostFromUrl(input.url) } : {}),
      ...(input.metadata ?? {}),
    },
  };
}

export function recordIntegrationUsage(input: IntegrationUsageInput): IntegrationUsageEvent {
  const event = normalizeUsage(input);
  mkdirSync(dirname(USAGE_LOG_PATH), { recursive: true });
  appendFileSync(USAGE_LOG_PATH, `${JSON.stringify(event)}\n`, "utf-8");
  return event;
}

export function recordApiUsage(input: IntegrationUsageInput): IntegrationUsageEvent {
  return recordIntegrationUsage(input);
}

export async function trackedFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  usage: TrackedFetchOptions = {},
): Promise<Response> {
  const startedAt = Date.now();
  const url = usage.url ?? urlText(input);
  const method = init?.method ?? (typeof Request !== "undefined" && input instanceof Request ? input.method : "GET");
  try {
    const response = await fetch(input, init);
    recordIntegrationUsage({
      ...usage,
      url,
      status: response.ok ? "success" : "error",
      operation: usage.operation ?? `${method} ${hostFromUrl(url) ?? "external"}`,
      error: response.ok ? null : `HTTP ${response.status}`,
      metadata: {
        durationMs: Date.now() - startedAt,
        statusCode: response.status,
        ...(usage.metadata ?? {}),
      },
    });
    return response;
  } catch (error) {
    recordIntegrationUsage({
      ...usage,
      url,
      status: "error",
      operation: usage.operation ?? `${method} ${hostFromUrl(url) ?? "external"}`,
      error: error instanceof Error ? error.message : String(error),
      metadata: {
        durationMs: Date.now() - startedAt,
        ...(usage.metadata ?? {}),
      },
    });
    throw error;
  }
}

export function getIntegrationUsage(limit = 100): IntegrationUsageEvent[] {
  if (!existsSync(USAGE_LOG_PATH)) return [];

  return readFileSync(USAGE_LOG_PATH, "utf-8")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((line) => {
      try {
        return JSON.parse(line) as IntegrationUsageEvent;
      } catch {
        return null;
      }
    })
    .filter((event): event is IntegrationUsageEvent => event !== null)
    .slice(-MAX_USAGE_EVENTS)
    .reverse()
    .slice(0, limit);
}

export function getIntegrationUsageStats(events = getIntegrationUsage(MAX_USAGE_EVENTS)) {
  const byIntegration: Record<
    string,
    { calls: number; costUsd: number; quantity: number; errors: number; unit: string }
  > = {};

  for (const event of events) {
    const current = byIntegration[event.integrationId] ?? {
      calls: 0,
      costUsd: 0,
      quantity: 0,
      errors: 0,
      unit: event.unit,
    };
    current.calls += 1;
    current.costUsd += event.costUsd;
    current.quantity += event.quantity;
    if (event.status === "error") current.errors += 1;
    byIntegration[event.integrationId] = current;
  }

  return {
    totalEvents: events.length,
    totalCostUsd: events.reduce((sum, event) => sum + event.costUsd, 0),
    totalErrors: events.filter((event) => event.status === "error").length,
    byIntegration,
  };
}
