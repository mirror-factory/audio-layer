#!/usr/bin/env tsx
/**
 * Research cache bootstrap -- creates .ai-starter/research/ directory layout.
 *
 * Seeds placeholder CURRENT.md files for each library and writes index.json.
 * Idempotent: re-running preserves hand-edited content.
 *
 * HOW TO CUSTOMIZE:
 * 1. Update LIBRARIES array with your project's dependencies
 * 2. Update triggerPaths to match your file structure
 * 3. Run: npx tsx scripts/research-bootstrap.ts
 *
 * Copied from vercel-ai-starter-kit. Customize for your project.
 */

import { mkdirSync, writeFileSync, existsSync, readFileSync } from 'fs';
import { join, resolve, dirname } from 'path';
import { createHash } from 'crypto';

const ROOT = resolve(__dirname, '..');
const RESEARCH_DIR = join(ROOT, '.ai-starter', 'research');
const LIBRARIES_DIR = join(RESEARCH_DIR, 'libraries');
const TOOLS_DIR = join(RESEARCH_DIR, 'tools');
const INDEX_PATH = join(RESEARCH_DIR, 'index.json');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

interface ResearchSource { url: string; title: string; }
interface ResearchEntry { id: string; type: 'library' | 'tool'; path: string; lastFetched: string; validUntil: string; contentHash: string; sources: ResearchSource[]; triggerPaths: string[]; }
interface ResearchIndex { version: number; generated: string; entries: ResearchEntry[]; }
interface LibrarySeed { id: string; name: string; version: string; sources: ResearchSource[]; triggerPaths: string[]; }

function hashContent(content: string): string {
  return 'sha256:' + createHash('sha256').update(content, 'utf-8').digest('hex');
}

function ensureDir(d: string): void { if (!existsSync(d)) mkdirSync(d, { recursive: true }); }

function writeIfMissingOrPlaceholder(path: string, content: string, marker = 'populated by `pnpm research:refresh'): boolean {
  ensureDir(dirname(path));
  if (existsSync(path)) {
    const existing = readFileSync(path, 'utf-8');
    if (!existing.includes(marker)) return false; // hand-edited: leave alone
  }
  writeFileSync(path, content, 'utf-8');
  return true;
}

const placeholderFor = (name: string, id: string, version: string) => `---
library: ${name}
id: ${id}
version: "${version}"
lastFetched: "pending"
---

# ${name} -- Current Patterns

> This file is a placeholder and is populated by \`pnpm research:refresh ${id}\`.
> The freshness gate will flag it as STALE until it is replaced with real docs.

## Key Patterns

_Pending research refresh._

## Breaking Changes

_Pending research refresh._

## Common Gotchas

_Pending research refresh._
`;

// TODO: Customize this list for your project's dependencies
const LIBRARIES: LibrarySeed[] = [
  {
    id: 'ai-sdk-v6',
    name: 'Vercel AI SDK',
    version: '6.x',
    sources: [{ url: 'https://sdk.vercel.ai/docs', title: 'Vercel AI SDK docs' }],
    triggerPaths: ['lib/ai/**', 'app/api/chat/**'],
  },
  {
    id: 'next-15',
    name: 'Next.js',
    version: '15.x',
    sources: [{ url: 'https://nextjs.org/docs', title: 'Next.js docs' }],
    triggerPaths: ['app/**', 'middleware.ts', 'next.config.mjs'],
  },
  {
    id: 'playwright',
    name: 'Playwright',
    version: '1.x',
    sources: [{ url: 'https://playwright.dev/docs/intro', title: 'Playwright docs' }],
    triggerPaths: ['tests/e2e/**', 'playwright.config.ts'],
  },
  {
    id: 'tailwind-v4',
    name: 'Tailwind CSS',
    version: '4.x',
    sources: [{ url: 'https://tailwindcss.com/docs', title: 'Tailwind CSS docs' }],
    triggerPaths: ['app/globals.css', 'postcss.config.js', 'components/**/*.tsx'],
  },
];

function bootstrap(): void {
  ensureDir(RESEARCH_DIR);
  ensureDir(LIBRARIES_DIR);
  ensureDir(TOOLS_DIR);

  writeIfMissingOrPlaceholder(join(TOOLS_DIR, 'README.md'), `# Tool Research Cache\n\nPer-tool research entries populated on demand.\nEach entry: \`<tool-id>/CURRENT.md\` tracked in index.json.\n`, 'Tool Research Cache');

  const now = new Date();
  const entries: ResearchEntry[] = [];

  for (const lib of LIBRARIES) {
    const mdPath = join(LIBRARIES_DIR, lib.id, 'CURRENT.md');
    writeIfMissingOrPlaceholder(mdPath, placeholderFor(lib.name, lib.id, lib.version));
    const diskContent = readFileSync(mdPath, 'utf-8');

    entries.push({
      id: lib.id, type: 'library',
      path: `.ai-starter/research/libraries/${lib.id}/CURRENT.md`,
      lastFetched: new Date(0).toISOString(),
      validUntil: new Date(0).toISOString(),
      contentHash: hashContent(diskContent),
      sources: lib.sources,
      triggerPaths: lib.triggerPaths,
    });
  }

  const index: ResearchIndex = { version: 1, generated: now.toISOString(), entries };
  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf-8');

  console.log('[research:bootstrap] wrote:');
  console.log(`  ${INDEX_PATH.replace(ROOT + '/', '')}`);
  for (const e of entries) console.log(`  ${e.path} STALE`);
}

bootstrap();
