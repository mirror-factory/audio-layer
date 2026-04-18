/**
 * GET /api/dev-kit/registries -- list every vendor registry in the project
 * with models, pricing, staleness, and provenance.
 *
 * Reads .ai-dev-kit/registries/*.json. Zero network calls. The registries
 * are the source of truth for valid model IDs + pricing; this endpoint
 * surfaces them dynamically to the dashboard so the user can see what the
 * project actually talks to.
 */

import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { NextResponse } from 'next/server';
import { withRoute } from '@/lib/with-route';

export const GET = withRoute(async () => {
  const cwd = process.cwd();
  const dir = join(cwd, '.ai-dev-kit/registries');
  if (!existsSync(dir)) {
    return NextResponse.json({ registries: [], hint: 'Add one: `ai-dev-kit registry add <vendor>`' });
  }

  const now = Date.now();
  const registries: Array<Record<string, unknown>> = [];

  for (const file of readdirSync(dir)) {
    if (!file.endsWith('.json') || file === 'registry.schema.json') continue;
    try {
      const reg = JSON.parse(readFileSync(join(dir, file), 'utf-8')) as Record<string, unknown>;
      const validatedOn = String(reg.validated_on ?? '');
      const ts = Date.parse(validatedOn);
      const ageDays = Number.isFinite(ts) ? Math.floor((now - ts) / 86_400_000) : Infinity;

      // Collect slots (every key ending in _models).
      const slots: Record<string, unknown[]> = {};
      for (const [key, value] of Object.entries(reg)) {
        if (/_models$/.test(key) && Array.isArray(value)) slots[key] = value;
      }

      registries.push({
        vendor: reg.vendor,
        label: reg.label,
        docs_root: reg.docs_root,
        console_url: reg.console_url,
        validated_on: validatedOn,
        ageDays,
        stale: ageDays > 90,
        required_env: reg.required_env ?? [],
        deprecations: reg.deprecations ?? [],
        slots,
      });
    } catch {
      registries.push({ vendor: file.replace('.json', ''), error: 'malformed JSON' });
    }
  }

  return NextResponse.json({ ts: new Date().toISOString(), registries });
});
