#!/usr/bin/env tsx
/**
 * Docs Manifest Generator — Scans reference/, guides/, architecture/ and
 * produces docs/manifest.json with content hashes and metadata.
 *
 * Run: `tsx scripts/docs-generate-manifest.ts`
 *
 * This is the bootstrap script. Run it once to create the initial manifest,
 * then use docs-sync.ts for incremental freshness checks.
 */

import { createHash } from 'crypto';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'fs';
import { join, basename, extname } from 'path';

// ── Types ─────────────────────────────────────────────────────────────

type Priority = 'hot' | 'warm' | 'cold';

interface DocEntry {
  id: string;
  title: string;
  localPath: string;
  sourceUrl: string;
  priority: Priority;
  tags: string[];
  contentHash: string;
  lastCheckedAt: string;
  lastChangedAt: string;
}

interface DocsManifest {
  version: number;
  lastUpdated: string;
  docs: DocEntry[];
}

// ── Source URL mapping ────────────────────────────────────────────────

const SOURCE_URLS: Record<string, string> = {
  'ai-sdk-v6-patterns': 'https://ai-sdk.dev/docs',
  'ai-sdk-v6-changelog': 'https://ai-sdk.dev/docs/changelog',
  'ai-elements': 'https://elements.ai-sdk.dev/',
  'expect-browser-testing': 'https://www.expect.dev/',
  'million-js': 'https://million.dev',
  'react-scan': 'https://react-scan.com',
  'supabase-auth-nextjs': 'https://supabase.com/docs/guides/auth',
  'supabase-pgvector': 'https://supabase.com/docs/guides/ai',
  'ollama-local-testing': 'https://ollama.com/',
  'model-provider-reference': 'https://vercel.com/ai-gateway/models',
};

// ── Tag extraction ────────────────────────────────────────────────────

const TAG_KEYWORDS: Record<string, string[]> = {
  sdk: ['ai sdk', 'ai-sdk', 'streamtext', 'generatetext', 'vercel ai'],
  api: ['api route', 'api contract', 'endpoint', 'rest'],
  testing: ['test', 'vitest', 'playwright', 'e2e', 'eval', 'smoke'],
  auth: ['auth', 'supabase auth', 'login', 'session', 'jwt'],
  deployment: ['deploy', 'vercel', 'ci', 'cd', 'production'],
  performance: ['performance', 'bundle', 'lazy', 'million', 'react-scan', 'cache'],
  observability: ['telemetry', 'observability', 'monitoring', 'logging', 'tracing'],
  tools: ['tool', 'tool-meta', 'registry', 'plannable'],
  prompts: ['prompt', 'system prompt', 'prompt engineering'],
  database: ['supabase', 'postgres', 'pgvector', 'embedding'],
  accessibility: ['a11y', 'accessibility', 'aria', 'wcag'],
  i18n: ['i18n', 'internationalization', 'locale'],
  security: ['rate limit', 'auth', 'security', 'cost control'],
  critical: ['critical', 'breaking', 'migration'],
};

function extractTags(filename: string, content: string): string[] {
  const tags: string[] = [];
  const lowerContent = content.toLowerCase();
  const lowerFilename = filename.toLowerCase();

  for (const [tag, keywords] of Object.entries(TAG_KEYWORDS)) {
    const matched = keywords.some(
      kw => lowerContent.includes(kw) || lowerFilename.includes(kw)
    );
    if (matched) tags.push(tag);
  }

  return tags.length > 0 ? tags : ['general'];
}

// ── Priority assignment ───────────────────────────────────────────────

function getPriority(dir: string, filename: string): Priority {
  // Reference docs are hot (SDK patterns, breaking changes, model reference)
  if (dir === 'reference') {
    // README files are just indexes, keep warm
    if (filename === 'README.md') return 'warm';
    return 'hot';
  }

  // Architecture docs are warm
  if (dir === 'architecture') {
    if (filename === 'README.md') return 'cold';
    return 'warm';
  }

  // Guides are warm
  if (dir === 'guides') {
    if (filename === 'README.md') return 'cold';
    return 'warm';
  }

  return 'cold';
}

// ── Title extraction ──────────────────────────────────────────────────

function extractTitle(content: string): string {
  const match = content.match(/^#\s+(.+)$/m);
  return match ? match[1].trim() : 'Untitled';
}

// ── Hash computation ──────────────────────────────────────────────────

function computeHash(content: string): string {
  return createHash('sha256').update(content, 'utf-8').digest('hex');
}

// ── ID from filename ──────────────────────────────────────────────────

function filenameToId(filename: string): string {
  return basename(filename, extname(filename))
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

// ── Scanner ───────────────────────────────────────────────────────────

const SCAN_DIRS = ['reference', 'guides', 'architecture'] as const;

function scanDocs(): DocEntry[] {
  const entries: DocEntry[] = [];
  const now = new Date().toISOString();

  for (const dir of SCAN_DIRS) {
    const dirPath = join(process.cwd(), dir);
    if (!existsSync(dirPath)) {
      console.log(`  Skipping ${dir}/ (not found)`);
      continue;
    }

    const files = readdirSync(dirPath).filter(f => f.endsWith('.md'));
    console.log(`  Scanning ${dir}/ — ${files.length} files`);

    for (const file of files) {
      const filePath = join(dirPath, file);
      const content = readFileSync(filePath, 'utf-8');
      const id = filenameToId(file);

      entries.push({
        id,
        title: extractTitle(content),
        localPath: `${dir}/${file}`,
        sourceUrl: SOURCE_URLS[id] || '',
        priority: getPriority(dir, file),
        tags: extractTags(file, content),
        contentHash: computeHash(content),
        lastCheckedAt: now,
        lastChangedAt: now,
      });
    }
  }

  return entries;
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  console.log('\n  Docs Manifest Generator\n');
  console.log('  ────────────────────────────────────────\n');

  const docs = scanDocs();

  const manifest: DocsManifest = {
    version: 1,
    lastUpdated: new Date().toISOString(),
    docs,
  };

  const outputPath = join(process.cwd(), 'docs', 'manifest.json');
  writeFileSync(outputPath, JSON.stringify(manifest, null, 2) + '\n', 'utf-8');

  console.log(`\n  Generated ${docs.length} entries → docs/manifest.json`);

  // Summary by priority
  const byPriority = docs.reduce<Record<string, number>>((acc, d) => {
    acc[d.priority] = (acc[d.priority] || 0) + 1;
    return acc;
  }, {});

  for (const [priority, count] of Object.entries(byPriority)) {
    console.log(`    ${priority}: ${count}`);
  }

  console.log('');
}

main();
