#!/usr/bin/env tsx
/**
 * Injects the "Active Research" section into AGENTS.md from
 * .claude/research/index.json.
 *
 * Idempotent: running twice produces identical output.
 * Run: pnpm research:agents-md
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import { readFileSync, writeFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

const ROOT = resolve(__dirname, '..');
const INDEX_PATH = join(ROOT, '.claude', 'research', 'index.json');
const AGENTS_PATH = join(ROOT, 'AGENTS.md');

const START = '<!-- RESEARCH:START -->';
const END = '<!-- RESEARCH:END -->';

interface ResearchEntry { id: string; type: string; path: string; lastFetched: string; validUntil: string; sources: Array<{ url: string; title: string }>; triggerPaths: string[]; }
interface ResearchIndex { version: number; generated: string; entries: ResearchEntry[]; }

function daysSince(iso: string): number {
  const then = new Date(iso).getTime();
  if (!Number.isFinite(then) || then <= 0) return Infinity;
  return Math.floor((Date.now() - then) / (24 * 60 * 60 * 1000));
}

function formatEntry(e: ResearchEntry): string {
  const days = daysSince(e.lastFetched);
  const stale = days > 7 || !Number.isFinite(days);
  const age = !Number.isFinite(days) ? 'never fetched' : days === 0 ? 'today' : `${days} day${days === 1 ? '' : 's'} ago`;
  return `- **${e.id}** (${e.type}) -- \`${e.path}\` -- Last updated: ${age}${stale ? ' [!] STALE' : ''}`;
}

function renderSection(index: ResearchIndex): string {
  const lines: string[] = [START, ''];
  lines.push('Before editing code that touches these libraries, read the corresponding `.claude/research/libraries/*/CURRENT.md` file. If STALE, run `pnpm research:refresh <id>` first.');
  lines.push('');
  const libs = index.entries.filter(e => e.type === 'library');
  const tools = index.entries.filter(e => e.type === 'tool');
  if (libs.length > 0) { lines.push('### Libraries', ''); for (const e of libs) lines.push(formatEntry(e)); lines.push(''); }
  if (tools.length > 0) { lines.push('### Tools', ''); for (const e of tools) lines.push(formatEntry(e)); lines.push(''); }
  lines.push(`_Index generated ${index.generated}. Entries: ${index.entries.length}._`, '', END);
  return lines.join('\n');
}

function main(): void {
  if (!existsSync(INDEX_PATH)) { console.error(`${INDEX_PATH} not found. Run research-bootstrap.ts first.`); process.exit(1); }
  if (!existsSync(AGENTS_PATH)) { console.error(`${AGENTS_PATH} not found`); process.exit(1); }

  const index = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as ResearchIndex;
  const agents = readFileSync(AGENTS_PATH, 'utf-8');
  const section = renderSection(index);

  const startIdx = agents.indexOf(START);
  const endIdx = agents.indexOf(END);
  let updated: string;
  if (startIdx !== -1 && endIdx !== -1 && endIdx > startIdx) {
    updated = agents.slice(0, startIdx) + section + agents.slice(endIdx + END.length);
  } else {
    updated = agents.trimEnd() + '\n\n## Active Research\n\n' + section + '\n';
  }

  if (updated !== agents) {
    writeFileSync(AGENTS_PATH, updated, 'utf-8');
    console.log(`[research:agents-md] updated AGENTS.md (${index.entries.length} entries)`);
  } else {
    console.log(`[research:agents-md] AGENTS.md already up to date`);
  }
}

main();
