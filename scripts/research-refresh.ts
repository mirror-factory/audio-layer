#!/usr/bin/env tsx
/**
 * Refresh cached research entries under .ai-starter/research/.
 *
 * Usage:
 *   pnpm research:refresh <library-id>
 *   pnpm research:refresh --all
 *
 * The refresher is intentionally local-first. It fetches each entry's docsUrl,
 * writes a compact local research note, and updates freshness metadata so hooks
 * and gates can verify that dependency-sensitive work is grounded in current docs.
 */

import { createHash } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';
import { fileURLToPath } from 'url';

interface ResearchSource {
  url: string;
  title: string;
}

interface ResearchEntry {
  id: string;
  type?: 'library' | 'tool';
  path?: string;
  library?: string;
  version?: string;
  lastFetched?: string | null;
  validUntil?: string | null;
  contentHash?: string;
  summary?: string;
  docsUrl?: string;
  context7LibraryId?: string;
  sources?: ResearchSource[];
  triggerPaths?: string[];
}

interface ResearchIndex {
  version: number;
  generated?: string;
  lastUpdated?: string;
  entries: ResearchEntry[];
}

interface FetchedDoc {
  url: string;
  title: string;
  status: number;
  finalUrl: string;
  excerpt: string;
}

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const INDEX_PATH = join(ROOT, '.ai-starter', 'research', 'index.json');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

const DEFAULT_TRIGGER_PATHS: Record<string, string[]> = {
  'vercel-ai-sdk': ['lib/ai/**', 'app/api/chat/**', 'app/api/**'],
  'ai-sdk-v6': ['lib/ai/**', 'app/api/chat/**', 'app/api/**'],
  nextjs: ['app/**', 'middleware.ts', 'next.config.*'],
  'next-15': ['app/**', 'middleware.ts', 'next.config.*'],
  tailwindcss: ['app/globals.css', 'components/**/*.tsx', 'postcss.config.*'],
  'tailwind-v4': ['app/globals.css', 'components/**/*.tsx', 'postcss.config.*'],
  supabase: ['lib/supabase/**', 'lib/db/**', 'app/api/**'],
  vitest: ['tests/**', '**/*.test.ts', '**/*.test.tsx', 'vitest.config.*'],
  playwright: ['tests/e2e/**', 'playwright.config.ts'],
};

function hashContent(content: string): string {
  return `sha256:${createHash('sha256').update(content, 'utf-8').digest('hex')}`;
}

function readJson<T>(path: string): T {
  return JSON.parse(readFileSync(path, 'utf-8')) as T;
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function entryName(entry: ResearchEntry): string {
  return entry.library ?? entry.id;
}

function entryDocsUrl(entry: ResearchEntry): string {
  return entry.docsUrl ?? entry.sources?.[0]?.url ?? '';
}

function entryPath(entry: ResearchEntry): string {
  return entry.path ?? `.ai-starter/research/libraries/${entry.id}.md`;
}

function entrySources(entry: ResearchEntry): ResearchSource[] {
  const existing = entry.sources ?? [];
  if (existing.length > 0) return existing;
  const docsUrl = entry.docsUrl;
  return docsUrl ? [{ url: docsUrl, title: `${entryName(entry)} docs` }] : [];
}

function inferTriggerPaths(entry: ResearchEntry): string[] {
  return entry.triggerPaths?.length
    ? entry.triggerPaths
    : DEFAULT_TRIGGER_PATHS[entry.id] ?? ['app/**', 'components/**', 'lib/**'];
}

function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function titleFromHtml(html: string, fallback: string): string {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return stripHtml(match?.[1] ?? '').slice(0, 120) || fallback;
}

async function fetchDoc(url: string, fallbackTitle: string): Promise<FetchedDoc> {
  const response = await fetch(url, {
    redirect: 'follow',
    headers: {
      accept: 'text/html, text/markdown, text/plain;q=0.9, */*;q=0.8',
      'user-agent': 'ai-starter-kit-research-refresh/0.1',
    },
  });
  const text = await response.text();
  const contentType = response.headers.get('content-type') ?? '';
  const isHtml = contentType.includes('html') || /<html|<title|<body/i.test(text);
  const title = isHtml ? titleFromHtml(text, fallbackTitle) : fallbackTitle;
  const body = isHtml ? stripHtml(text) : text.replace(/\s+/g, ' ').trim();
  return {
    url,
    title,
    status: response.status,
    finalUrl: response.url || url,
    excerpt: body.slice(0, 5000),
  };
}

function renderResearchNote(entry: ResearchEntry, fetchedDocs: FetchedDoc[], now: Date): string {
  const sources = entrySources(entry);
  const fetched = fetchedDocs[0];
  const failedSources = sources.filter(source =>
    !fetchedDocs.some(doc => doc.url === source.url),
  );

  return `# ${entryName(entry)} — Current Research

> Library ID: \`${entry.context7LibraryId ?? entry.id}\`
> Docs: ${entryDocsUrl(entry) || 'not configured'}
> Last fetched: ${now.toISOString()}
> Valid until: ${new Date(now.getTime() + SEVEN_DAYS_MS).toISOString()}

## Summary

${entry.summary ?? `Current local research cache for ${entryName(entry)}.`}

## Retrieved Sources

${fetchedDocs.length > 0
  ? fetchedDocs.map(doc => `- ${doc.title} — ${doc.finalUrl} (${doc.status})`).join('\n')
    : '- No source could be fetched. Check docsUrl/sources in .ai-starter/research/index.json.'}
${failedSources.length > 0
  ? `\n\n## Fetch Warnings\n\n${failedSources.map(source => `- Could not fetch ${source.title}: ${source.url}`).join('\n')}`
  : ''}

## Current Docs Snapshot

${fetched
  ? fetched.excerpt
  : 'No fetched excerpt available. The index metadata was not updated for this entry.'}

## Agent Usage

- Prefer repo-local patterns first.
- Use this file before editing trigger paths: ${inferTriggerPaths(entry).join(', ')}.
- Refresh with \`pnpm research:refresh ${entry.id}\` before dependency upgrades or risky API changes.
`;
}

async function refreshEntry(index: ResearchIndex, entry: ResearchEntry): Promise<void> {
  const sources = entrySources(entry);
  if (sources.length === 0) {
    throw new Error(`${entry.id} has no docsUrl or sources[]`);
  }

  const fetchedDocs: FetchedDoc[] = [];
  for (const source of sources) {
    try {
      fetchedDocs.push(await fetchDoc(source.url, source.title));
    } catch (error) {
      process.stderr.write(
        `[research:refresh] warning: ${entry.id} failed to fetch ${source.url}: ${
          error instanceof Error ? error.message : String(error)
        }\n`,
      );
    }
  }

  if (fetchedDocs.length === 0) {
    throw new Error(`${entry.id} could not fetch any configured source`);
  }

  const now = new Date();
  const relativePath = entryPath(entry);
  const absolutePath = join(ROOT, relativePath);
  const content = renderResearchNote(entry, fetchedDocs, now);

  mkdirSync(dirname(absolutePath), { recursive: true });
  writeFileSync(absolutePath, content, 'utf-8');

  entry.type = entry.type ?? 'library';
  entry.path = relativePath;
  entry.lastFetched = now.toISOString();
  entry.validUntil = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString();
  entry.contentHash = hashContent(content);
  entry.sources = sources;
  entry.triggerPaths = inferTriggerPaths(entry);
  if (!entry.docsUrl) entry.docsUrl = sources[0]?.url;

  index.generated = now.toISOString();
  index.lastUpdated = now.toISOString();
  process.stdout.write(`[research:refresh] ${entry.id} fetched ${fetchedDocs.length} source(s), valid until ${entry.validUntil.slice(0, 10)}\n`);
}

async function main(): Promise<void> {
  if (!existsSync(INDEX_PATH)) {
    throw new Error('index.json not found. Run `pnpm research:bootstrap` first.');
  }

  const index = readJson<ResearchIndex>(INDEX_PATH);
  const arg = process.argv[2];
  if (!arg) {
    throw new Error('Usage: pnpm research:refresh <library-id> OR pnpm research:refresh --all');
  }

  const entries = arg === '--all'
    ? index.entries
    : index.entries.filter(entry => entry.id === arg);

  if (entries.length === 0) {
    throw new Error(`Unknown id: ${arg}. Known: ${index.entries.map(entry => entry.id).join(', ')}`);
  }

  for (const entry of entries) {
    await refreshEntry(index, entry);
  }

  writeJson(INDEX_PATH, index);
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
