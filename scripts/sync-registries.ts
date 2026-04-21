#!/usr/bin/env tsx
/**
 * sync-registries -- scan the codebase and refresh the auto-populated
 * registries: components, pages, tools, skills.
 *
 * Invocation:
 *   - pre-commit (pre-registry-strings step)
 *   - `ai-dev-kit onboard` (once per install)
 *   - standalone: `npx tsx scripts/sync-registries.ts`
 *
 * Policy:
 *   * Never deletes hand-edited fields on entries (owner, status, auth, etc.).
 *     New fields are merged in; removed source files mark the entry with
 *     `removed_on: <iso>` instead of deleting so the registry is an
 *     append-only source of truth.
 *   * Writes atomically (tmp + rename) so a crashed sync never corrupts.
 *   * Emits ZERO stdout on no-op; single-line summary when something changes.
 *   * Exits 0 always. The pre-commit gate's job is to check doctor (which
 *     verifies freshness), not to block on a sync error.
 */

import { existsSync, readFileSync, writeFileSync, readdirSync, statSync, renameSync, mkdirSync } from 'node:fs';
import { join, relative, dirname } from 'node:path';

const CWD = process.cwd();
const REG_DIR = join(CWD, '.ai-dev-kit', 'registries');
const NOW = new Date().toISOString();

interface RegistryFile {
  kind: string;
  schema_version: number;
  last_synced_on: string | null;
  entries: Array<Record<string, unknown>>;
}

function readRegistry(name: string): RegistryFile {
  const path = join(REG_DIR, `${name}.yaml`);
  if (!existsSync(path)) {
    return { kind: name, schema_version: 1, last_synced_on: null, entries: [] };
  }
  const src = readFileSync(path, 'utf-8');
  return parseSimpleRegistry(src, name);
}

function writeRegistry(name: string, reg: RegistryFile): void {
  const path = join(REG_DIR, `${name}.yaml`);
  const tmp = `${path}.tmp`;
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(tmp, renderRegistry(reg));
  renameSync(tmp, path);
}

function parseSimpleRegistry(src: string, fallbackKind: string): RegistryFile {
  const lines = src.split('\n');
  const out: RegistryFile = {
    kind: fallbackKind,
    schema_version: 1,
    last_synced_on: null,
    entries: [],
  };

  let inEntries = false;
  let current: Record<string, unknown> | null = null;

  const commit = () => {
    if (current && Object.keys(current).length > 0) out.entries.push(current);
    current = null;
  };

  for (const raw of lines) {
    const line = raw.replace(/\t/g, '  ');
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;

    if (!inEntries) {
      const k = line.match(/^kind:\s*(.+)$/);
      if (k) { out.kind = k[1].trim(); continue; }
      const v = line.match(/^schema_version:\s*(\d+)$/);
      if (v) { out.schema_version = Number(v[1]); continue; }
      const s = line.match(/^last_synced_on:\s*(.+)$/);
      if (s) {
        const val = s[1].trim();
        out.last_synced_on = val === 'null' || val === '~' ? null : val.replace(/^["']|["']$/g, '');
        continue;
      }
      if (/^entries:\s*(\[\]|)\s*$/.test(line)) {
        inEntries = true;
        continue;
      }
    } else {
      const itemStart = line.match(/^\s+-\s+([a-z_]+):\s*(.*)$/);
      if (itemStart) {
        commit();
        current = {};
        current[itemStart[1]] = coerceScalar(itemStart[2]);
        continue;
      }
      const kv = line.match(/^\s+([a-z_]+):\s*(.*)$/);
      if (kv && current) {
        current[kv[1]] = coerceScalar(kv[2]);
      }
    }
  }
  commit();
  return out;
}

function coerceScalar(raw: string): unknown {
  const v = raw.trim().replace(/^["']|["']$/g, '');
  if (v === '' || v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+$/.test(v)) return Number(v);
  return v;
}

function renderRegistry(reg: RegistryFile): string {
  const lines: string[] = [];
  lines.push(`kind: ${reg.kind}`);
  lines.push(`schema_version: ${reg.schema_version}`);
  lines.push(`last_synced_on: ${reg.last_synced_on ?? 'null'}`);
  if (reg.entries.length === 0) {
    lines.push('entries: []');
  } else {
    lines.push('entries:');
    for (const e of reg.entries) {
      const keys = Object.keys(e);
      if (keys.length === 0) continue;
      lines.push(`  - ${keys[0]}: ${formatValue(e[keys[0]])}`);
      for (let i = 1; i < keys.length; i++) {
        lines.push(`    ${keys[i]}: ${formatValue(e[keys[i]])}`);
      }
    }
  }
  return lines.join('\n') + '\n';
}

function formatValue(v: unknown): string {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (/[:#\[\]{}&*!|>'"%@`]|^\s|\s$/.test(s)) return JSON.stringify(s);
  return s;
}

// ── Scanners ───────────────────────────────────────────────────────────

function walk(dir: string, ext: string[], out: string[] = []): string[] {
  if (!existsSync(dir)) return out;
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'dist' || entry === '.turbo' || entry.startsWith('.')) continue;
    const full = join(dir, entry);
    const st = statSync(full);
    if (st.isDirectory()) walk(full, ext, out);
    else if (ext.some(e => full.endsWith(e))) out.push(full);
  }
  return out;
}

function scanComponents(): Array<Record<string, unknown>> {
  const dirs = ['components', 'src/components', 'app/components'];
  const out: Array<Record<string, unknown>> = [];
  for (const d of dirs) {
    const abs = join(CWD, d);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs, ['.tsx', '.jsx'])) {
      if (file.endsWith('.test.tsx') || file.endsWith('.stories.tsx') || file.endsWith('.spec.tsx')) continue;
      const rel = relative(CWD, file);
      const name = rel.split('/').pop()!.replace(/\.(tsx|jsx)$/, '');
      const storyPath = file.replace(/\.(tsx|jsx)$/, '.stories.$1');
      const visualPath = join('tests/visual', `${name}.spec.ts`);
      out.push({
        name,
        path: rel,
        stories_path: existsSync(storyPath) ? relative(CWD, storyPath) : null,
        visual_path: existsSync(join(CWD, visualPath)) ? visualPath : null,
        owner: null,
        status: 'stable',
      });
    }
  }
  return out;
}

function scanPages(): Array<Record<string, unknown>> {
  const roots = ['app', 'src/app'];
  const out: Array<Record<string, unknown>> = [];
  for (const r of roots) {
    const abs = join(CWD, r);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs, ['.tsx'])) {
      if (!/\/page\.tsx$/.test(file)) continue;
      const rel = relative(CWD, file);
      // "app/dev-kit/runs/[id]/page.tsx" -> "/dev-kit/runs/[id]"
      const route = '/' + rel.replace(/^(src\/)?app\//, '').replace(/\/page\.tsx$/, '').replace(/^$/, '');
      out.push({
        route,
        path: rel,
        owner: null,
        auth: 'public',
        features: [],
      });
    }
  }
  return out;
}

// 0.2.14: API route scanner -- walks app/**/route.ts(x) and extracts the
// exported HTTP methods. Populates api-routes.yaml. This closes the gap
// where /api/chat, /api/transcribe etc. had zero visibility in the
// registry ecosystem (llms.txt:27 references it but it did not exist).
function scanApiRoutes(): Array<Record<string, unknown>> {
  const roots = ['app', 'src/app'];
  const out: Array<Record<string, unknown>> = [];
  for (const r of roots) {
    const abs = join(CWD, r);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs, ['.ts', '.tsx'])) {
      if (!/\/route\.(ts|tsx)$/.test(file)) continue;
      const rel = relative(CWD, file);
      // "app/api/chat/route.ts" -> "/api/chat"
      const route = '/' + rel.replace(/^(src\/)?app\//, '').replace(/\/route\.(ts|tsx)$/, '').replace(/^$/, '');
      const src = readFileSync(file, 'utf-8');
      const methods: string[] = [];
      for (const m of ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'HEAD', 'OPTIONS']) {
        const re = new RegExp(`export\\s+(?:async\\s+)?function\\s+${m}\\b|export\\s+const\\s+${m}\\s*=`);
        if (re.test(src)) methods.push(m);
      }
      if (methods.length === 0) continue;
      for (const method of methods) {
        out.push({
          // Composite key: one entry per (route, method) pair. The merge
          // helper dedupes on a single key field, so we synthesize `id`
          // as "METHOD ROUTE" (e.g., "POST /api/chat").
          id: `${method} ${route}`,
          route,
          method,
          path: rel,
          owner: null,
          auth: 'public',
          description: null,
        });
      }
    }
  }
  return out;
}

function scanTools(): Array<Record<string, unknown>> {
  const dirs = ['lib/ai/tools', 'src/lib/ai/tools'];
  const out: Array<Record<string, unknown>> = [];
  for (const d of dirs) {
    const abs = join(CWD, d);
    if (!existsSync(abs)) continue;
    for (const file of walk(abs, ['.ts'])) {
      if (file.endsWith('.test.ts') || file.endsWith('.spec.ts')) continue;
      const rel = relative(CWD, file);
      const src = readFileSync(file, 'utf-8');
      const nameMatch = src.match(/export\s+const\s+(\w+)\s*=\s*tool\(/);
      const descMatch = src.match(/description:\s*['"`]([^'"`]+)['"`]/);
      const hasTest = existsSync(file.replace(/\.ts$/, '.test.ts'));
      out.push({
        name: nameMatch?.[1] ?? rel.split('/').pop()!.replace(/\.ts$/, ''),
        path: rel,
        description: descMatch?.[1] ?? null,
        has_test: hasTest,
        owner: null,
      });
    }
  }
  return out;
}

// 0.2.14: bring MCP servers into the YAML registry ecosystem. Claude
// Code's source of truth stays `.mcp.json`; we mirror it into yaml so
// the dashboard and doctor have the same data shape as every other
// registry. required_env is extracted from the args/env block so doctor
// can warn when a required key is empty.
function scanMcpServers(): Array<Record<string, unknown>> {
  const path = join(CWD, '.mcp.json');
  if (!existsSync(path)) return [];
  let raw: string;
  try { raw = readFileSync(path, 'utf-8'); } catch { return []; }
  let data: { mcpServers?: Record<string, { command?: string; args?: string[]; env?: Record<string, string> }> };
  try { data = JSON.parse(raw); } catch { return []; }
  const servers = data.mcpServers ?? {};
  const out: Array<Record<string, unknown>> = [];
  for (const [name, cfg] of Object.entries(servers)) {
    const requiredEnv: string[] = [];
    for (const [k, v] of Object.entries(cfg.env ?? {})) {
      const m = String(v).match(/\$\{([^}]+)\}/);
      if (m) requiredEnv.push(m[1]);
      else if (v === '' || v == null) requiredEnv.push(k);
    }
    out.push({
      name,
      command: cfg.command ?? '',
      args: JSON.stringify(cfg.args ?? []),
      required_env: JSON.stringify(requiredEnv),
      used_by: '[]',
      description: null,
    });
  }
  return out;
}

function scanSkills(): Array<Record<string, unknown>> {
  const dirs = ['.claude/skills'];
  const out: Array<Record<string, unknown>> = [];

  // Read invocation rollups.
  const invFile = join(CWD, '.ai-dev-kit', 'state', 'skill-invocations.jsonl');
  const rollup: Record<string, { count: number; last_ts: string; last_run_id: string | null }> = {};
  if (existsSync(invFile)) {
    for (const line of readFileSync(invFile, 'utf-8').split('\n')) {
      if (!line.trim()) continue;
      try {
        const r = JSON.parse(line) as { skill: string; ts: string; run_id: string | null };
        const cur = rollup[r.skill] ?? { count: 0, last_ts: '', last_run_id: null };
        cur.count += 1;
        if (r.ts > cur.last_ts) {
          cur.last_ts = r.ts;
          cur.last_run_id = r.run_id;
        }
        rollup[r.skill] = cur;
      } catch { /* skip malformed lines */ }
    }
  }

  for (const d of dirs) {
    const abs = join(CWD, d);
    if (!existsSync(abs)) continue;
    for (const skill of readdirSync(abs)) {
      const skillPath = join(abs, skill, 'SKILL.md');
      if (!existsSync(skillPath)) continue;
      const src = readFileSync(skillPath, 'utf-8');
      const descMatch = src.match(/^description:\s*(.+)$/m);
      const r = rollup[skill] ?? { count: 0, last_ts: '', last_run_id: null };
      out.push({
        name: skill,
        path: relative(CWD, skillPath),
        description: descMatch?.[1]?.trim().replace(/^["']|["']$/g, '') ?? null,
        invocation_count: r.count,
        last_invoked_at: r.last_ts || null,
        last_run_id: r.last_run_id,
      });
    }
  }
  return out;
}

// ── Merge helper: preserve hand-edited fields ──────────────────────────

function mergeEntries(
  existing: Array<Record<string, unknown>>,
  scanned: Array<Record<string, unknown>>,
  keyField: string,
): Array<Record<string, unknown>> {
  const byKey = new Map(existing.map(e => [e[keyField] as string, e]));
  const out: Array<Record<string, unknown>> = [];
  const seen = new Set<string>();

  for (const s of scanned) {
    const key = s[keyField] as string;
    seen.add(key);
    const prior = byKey.get(key);
    if (!prior) {
      out.push({ ...s, created_on: NOW });
    } else {
      // Scanned fields win for auto-populated keys; prior wins for
      // hand-editable keys (owner, status, auth, notes).
      const HAND_EDIT = new Set(['owner', 'status', 'auth', 'notes']);
      const merged: Record<string, unknown> = { ...s };
      for (const [pk, pv] of Object.entries(prior)) {
        if (HAND_EDIT.has(pk) && pv != null && pv !== '') merged[pk] = pv;
        if (pk === 'created_on' && pv) merged.created_on = pv;
      }
      out.push(merged);
    }
  }

  // Preserve removed entries with a removed_on marker.
  for (const e of existing) {
    const key = e[keyField] as string;
    if (!seen.has(key) && !e.removed_on) {
      out.push({ ...e, removed_on: NOW });
    } else if (!seen.has(key)) {
      out.push(e);
    }
  }

  return out;
}

// ── Main ───────────────────────────────────────────────────────────────

function sync(name: string, keyField: string, scanner: () => Array<Record<string, unknown>>): boolean {
  const existing = readRegistry(name);
  const scanned = scanner();
  const merged = mergeEntries(existing.entries, scanned, keyField);

  const before = JSON.stringify(existing.entries);
  const after = JSON.stringify(merged);
  if (before === after) return false;

  existing.entries = merged;
  existing.last_synced_on = NOW;
  writeRegistry(name, existing);
  return true;
}

const changed: string[] = [];
if (sync('components', 'path', scanComponents)) changed.push('components');
if (sync('pages', 'route', scanPages)) changed.push('pages');
if (sync('api-routes', 'id', scanApiRoutes)) changed.push('api-routes');
if (sync('tools', 'path', scanTools)) changed.push('tools');
if (sync('skills', 'name', scanSkills)) changed.push('skills');
if (sync('mcp-servers', 'name', scanMcpServers)) changed.push('mcp-servers');

// Auto-scaffold a visual regression spec for every component that doesn't
// have one yet. Policy: never overwrite. The scaffold is a minimal
// toHaveScreenshot per-project spec; authors extend as needed.
const componentsReg = readRegistry('components');
for (const entry of componentsReg.entries) {
  const name = entry.name as string | undefined;
  const path = entry.path as string | undefined;
  if (!name || !path) continue;
  if (entry.removed_on) continue;
  const visualSpecPath = join(CWD, 'tests', 'visual', `${name}.spec.ts`);
  if (existsSync(visualSpecPath)) continue;

  const body = `/**
 * Auto-scaffolded by sync-registries.ts for ${name}.
 *
 * Runs across the 6-project matrix (mobile/tablet/desktop x light/dark)
 * from playwright.config.ts. Starts NOT-skipped (as of 0.2.8) so the
 * baseline either exists or the push fails loud.
 *
 * First run on this component: the test will fail because no baseline PNG
 * is committed yet. Create the baselines with:
 *
 *   VISUAL_UPDATE=1 pnpm exec playwright test tests/visual/${name}.spec.ts
 *
 * Commit the generated PNGs alongside this spec. Subsequent pushes compare
 * against them with maxDiffPixelRatio 0.01.
 *
 * Extend: replace the \`/\` route with a Storybook URL or a dedicated test
 * page, add interaction states (hover/focus/loading), mock props as needed.
 */
import { test, expect } from '@playwright/test';

test.describe('visual: ${name}', () => {
  test('matches baseline', async ({ page }, testInfo) => {
    // TODO: point at a Storybook URL / dedicated test page rendering ${name}.
    await page.goto('/');
    await expect(page).toHaveScreenshot(
      \`${name}-\${testInfo.project.name}.png\`,
      { animations: 'disabled', maxDiffPixelRatio: 0.01 },
    );
  });
});
`;
  try {
    mkdirSync(join(CWD, 'tests', 'visual'), { recursive: true });
    writeFileSync(visualSpecPath, body);
    changed.push(`visual-spec:${name}`);
  } catch { /* non-fatal */ }
}

if (changed.length > 0) {
  console.log(`[sync-registries] refreshed: ${changed.join(', ')}`);
}
