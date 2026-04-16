/**
 * Research Cache Registry
 *
 * Node-side reader for `.claude/research/index.json`. Consumed by
 * freshness gates and tooling that needs to know which research
 * entries map to which source files.
 *
 * Everything is derived at call time from disk -- no manual sync.
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import { readFileSync, existsSync } from 'fs';
import { join, resolve } from 'path';

// -- Types --

export interface ResearchSource { url: string; title: string; }

export interface ResearchEntry {
  id: string;
  type: 'library' | 'tool';
  path: string;
  lastFetched: string;
  validUntil: string;
  contentHash: string;
  sources: ResearchSource[];
  triggerPaths: string[];
}

export interface ResearchIndex {
  version: number;
  generated: string;
  entries: ResearchEntry[];
}

// -- Paths --

// TODO: Adjust this path resolution for your project structure
const ROOT = resolve(__dirname, '..', '..');
const INDEX_PATH = join(ROOT, '.claude', 'research', 'index.json');

// -- Loaders --

let cached: ResearchIndex | null = null;

export function getResearchIndex(force = false): ResearchIndex {
  if (!force && cached) return cached;
  if (!existsSync(INDEX_PATH)) {
    cached = { version: 1, generated: new Date(0).toISOString(), entries: [] };
    return cached;
  }
  try { cached = JSON.parse(readFileSync(INDEX_PATH, 'utf-8')) as ResearchIndex; }
  catch { cached = { version: 1, generated: new Date(0).toISOString(), entries: [] }; }
  return cached;
}

export function getResearchEntry(id: string): ResearchEntry | undefined {
  return getResearchIndex().entries.find(e => e.id === id);
}

// -- Freshness --

const DAY_MS = 24 * 60 * 60 * 1000;

export function daysSinceFetched(entry: ResearchEntry): number {
  const then = new Date(entry.lastFetched).getTime();
  if (!Number.isFinite(then) || then <= 0) return Number.POSITIVE_INFINITY;
  return Math.floor((Date.now() - then) / DAY_MS);
}

export function isResearchFresh(id: string, maxDays = 7): boolean {
  const entry = getResearchEntry(id);
  if (!entry) return false;
  if (daysSinceFetched(entry) > maxDays) return false;
  const validUntil = new Date(entry.validUntil).getTime();
  if (!Number.isFinite(validUntil) || validUntil < Date.now()) return false;
  return true;
}

export function getStaleEntries(maxDays = 7): ResearchEntry[] {
  return getResearchIndex().entries.filter(e => !isResearchFresh(e.id, maxDays));
}

// -- Trigger matching --

function globPrefix(pattern: string): string {
  const star = pattern.indexOf('*');
  return star === -1 ? pattern : pattern.slice(0, star);
}

export function getResearchIdsForPath(changedPath: string): string[] {
  const ids: string[] = [];
  for (const entry of getResearchIndex().entries) {
    for (const pattern of entry.triggerPaths) {
      const prefix = globPrefix(pattern);
      if (prefix === '' || changedPath === pattern || changedPath.startsWith(prefix)) {
        ids.push(entry.id); break;
      }
    }
  }
  return ids;
}

export function getRequiredResearchForPaths(changedPaths: string[]): { required: Set<string>; stale: Set<string> } {
  const required = new Set<string>();
  for (const p of changedPaths) for (const id of getResearchIdsForPath(p)) required.add(id);
  const stale = new Set<string>();
  for (const id of required) if (!isResearchFresh(id)) stale.add(id);
  return { required, stale };
}
