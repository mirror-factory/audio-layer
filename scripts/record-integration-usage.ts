#!/usr/bin/env tsx

import { appendFileSync, existsSync, mkdirSync, readFileSync } from 'fs';
import { dirname, resolve } from 'path';

interface UsageEvent {
  id: string;
  timestamp: string;
  integrationId: string;
  label: string;
  quantity: number;
  unit: string;
  unitCostUsd: number | null;
  costUsd: number;
  status: 'success' | 'error' | 'skipped';
  operation: string | null;
  route: string | null;
  error: string | null;
  url: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

function argValue(name: string): string | null {
  const prefix = `--${name}=`;
  const match = process.argv.find(arg => arg.startsWith(prefix));
  return match ? match.slice(prefix.length) : null;
}

function numberArg(name: string, fallback: number): number {
  const raw = argValue(name);
  if (!raw) return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/^https?:\/\//, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'custom-api';
}

function envKey(value: string): string {
  return value.toUpperCase().replace(/[^A-Z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function hostFromUrl(input: string | null): string | null {
  if (!input) return null;
  try { return new URL(input).hostname; } catch { return null; }
}

function inferIntegrationId(input: { id: string | null; route: string | null; operation: string | null; url: string | null }): string {
  if (input.id) return input.id;
  const haystack = [input.route, input.operation, input.url].filter(Boolean).join(' ').toLowerCase();
  const known: Array<[string, string]> = [
    ['assemblyai', 'assemblyai'],
    ['api.assemblyai.com', 'assemblyai'],
    ['resend', 'resend'],
    ['api.resend.com', 'resend'],
    ['stripe', 'stripe'],
    ['api.stripe.com', 'stripe'],
    ['supabase', 'supabase'],
    ['gateway.ai.vercel.com', 'vercel-ai-gateway'],
    ['ai-gateway', 'vercel-ai-gateway'],
    ['weather', 'weather-api'],
  ];
  for (const [needle, id] of known) {
    if (haystack.includes(needle)) return id;
  }
  const host = hostFromUrl(input.url);
  return host ? slugify(host.replace(/^api\./, '')) : 'custom-api-routes';
}

function manifestUnitCost(integrationId: string): number | null {
  const path = resolve(process.cwd(), '.ai-starter/manifests/integrations.json');
  try {
    if (!existsSync(path)) return null;
    const parsed = JSON.parse(readFileSync(path, 'utf-8'));
    if (!Array.isArray(parsed)) return null;
    const integration = parsed.find(item => item?.id === integrationId);
    const value = integration?.cost?.estimatedUnitCostUsd;
    return typeof value === 'number' && Number.isFinite(value) ? value : null;
  } catch {
    return null;
  }
}

function envUnitCost(integrationId: string, unit: string): number | null {
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

function metadataArg(): Record<string, string | number | boolean | null> {
  const values = process.argv
    .filter(arg => arg.startsWith('--metadata='))
    .map(arg => arg.slice('--metadata='.length));
  const metadata: Record<string, string | number | boolean | null> = {};
  for (const value of values) {
    const [key, raw = ''] = value.split(':');
    if (!key) continue;
    if (raw === 'true' || raw === 'false') metadata[key] = raw === 'true';
    else if (raw === 'null') metadata[key] = null;
    else if (raw !== '' && Number.isFinite(Number(raw))) metadata[key] = Number(raw);
    else metadata[key] = raw;
  }
  return metadata;
}

function main(): void {
  const route = argValue('route');
  const operation = argValue('operation');
  const url = argValue('url');
  const integrationId = inferIntegrationId({
    id: argValue('integration') ?? argValue('id'),
    route,
    operation,
    url,
  });
  if (!integrationId) {
    console.error('Usage: tsx scripts/record-integration-usage.ts --integration=assemblyai --quantity=1 --unit=request --cost=0.01');
    process.exit(1);
  }

  const quantity = numberArg('quantity', 1);
  const unit = argValue('unit') ?? 'request';
  const unitCostUsdRaw = argValue('unit-cost');
  const explicitUnitCost = unitCostUsdRaw === null ? null : Number(unitCostUsdRaw);
  const inferredUnitCost = explicitUnitCost === null || !Number.isFinite(explicitUnitCost)
    ? envUnitCost(integrationId, unit) ?? manifestUnitCost(integrationId)
    : explicitUnitCost;
  const explicitCost = argValue('cost');
  const costUsd = explicitCost === null
    ? inferredUnitCost === null || !Number.isFinite(inferredUnitCost)
      ? 0
      : quantity * inferredUnitCost
    : Number(explicitCost);

  const event: UsageEvent = {
    id: `iu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    integrationId,
    label: argValue('label') ?? integrationId,
    quantity,
    unit,
    unitCostUsd: inferredUnitCost === null || !Number.isFinite(inferredUnitCost) ? null : inferredUnitCost,
    costUsd: Number.isFinite(costUsd) ? costUsd : 0,
    status: (argValue('status') as UsageEvent['status'] | null) ?? 'success',
    operation,
    route,
    error: argValue('error'),
    url,
    metadata: {
      ...(url ? { url, host: hostFromUrl(url) } : {}),
      ...metadataArg(),
    },
  };

  const logPath = resolve(process.cwd(), '.ai-starter/runs/integration-usage.jsonl');
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(event)}\n`, 'utf-8');
  console.log(`integration-usage=${event.integrationId}`);
  console.log(`cost=${event.costUsd}`);
  console.log('record=.ai-starter/runs/integration-usage.jsonl');
}

main();
