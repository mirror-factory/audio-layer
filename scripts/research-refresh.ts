#!/usr/bin/env tsx
/**
 * Refreshes a cached research entry in .claude/research/.
 *
 * Usage: pnpm research:refresh <library-id>
 *
 * Updates lastFetched and validUntil timestamps in index.json.
 * TODO: Wire up Context7 MCP to regenerate CURRENT.md from live docs.
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { createHash } from 'crypto';

interface ResearchEntry { id: string; type: string; path: string; lastFetched: string; validUntil: string; contentHash: string; sources: Array<{ url: string; title: string }>; triggerPaths: string[]; }
interface ResearchIndex { version: number; generated: string; entries: ResearchEntry[]; }

const ROOT = resolve(__dirname, '..');
const INDEX_PATH = join(ROOT, '.claude', 'research', 'index.json');
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

function hashContent(content: string): string {
  return 'sha256:' + createHash('sha256').update(content, 'utf-8').digest('hex');
}

function refresh(libraryId: string): void {
  if (!existsSync(INDEX_PATH)) { console.error(`index.json not found. Run research-bootstrap.ts first.`); process.exit(1); }

  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as ResearchIndex;
  const entry = index.entries.find(e => e.id === libraryId);
  if (!entry) { console.error(`Unknown id: ${libraryId}. Known: ${index.entries.map(e => e.id).join(', ')}`); process.exit(1); }

  const filePath = join(ROOT, entry.path);
  if (!existsSync(filePath)) { console.error(`Backing file missing: ${entry.path}`); process.exit(1); }

  const content = readFileSync(filePath, 'utf-8');
  const now = new Date();
  entry.lastFetched = now.toISOString();
  entry.validUntil = new Date(now.getTime() + SEVEN_DAYS_MS).toISOString();
  entry.contentHash = hashContent(content);
  index.generated = now.toISOString();

  writeFileSync(INDEX_PATH, JSON.stringify(index, null, 2) + '\n', 'utf-8');
  console.log(`[research:refresh] ${libraryId} -- valid until ${entry.validUntil.slice(0, 10)}`);
}

const libraryId = process.argv[2];
if (!libraryId) { console.error('Usage: pnpm research:refresh <library-id>'); process.exit(1); }
refresh(libraryId);
