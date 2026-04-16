#!/usr/bin/env tsx
/**
 * Drift detection -- verify-after-green post-commit scan.
 *
 * Compares committed code against known-deprecated patterns cached in
 * `.claude/research/libraries/`. Non-blocking: reports only.
 *
 * Usage:
 *   npx tsx scripts/detect-drift.ts           # uses HEAD~1..HEAD
 *   npx tsx scripts/detect-drift.ts --all     # scan entire working tree
 *
 * Outputs:
 *   .evidence/drift-reports/<timestamp>.md
 *   .evidence/drift-reports/latest.json
 *
 * Copied from vercel-ai-dev-kit. Customize for your project.
 */

import { execSync } from 'child_process';
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'fs';
import { join, resolve } from 'path';
import { DRIFT_RULES, getLibrariesForFile, matchesGlob, type DriftRule } from './drift-rules';

const ROOT = resolve(__dirname, '..');
const REPORTS_DIR = join(ROOT, '.evidence', 'drift-reports');
const RESEARCH_DIR = join(ROOT, '.claude', 'research', 'libraries');

interface DriftHit { rule: string; library: string; severity: 'error' | 'warning'; file: string; line: number; snippet: string; message: string; fix: string; }
interface DriftReport { timestamp: string; mode: string; filesScanned: number; librariesTriggered: string[]; hits: DriftHit[]; durationMs: number; researchCacheFound: Record<string, boolean>; }

function getCommittedFiles(): string[] {
  try { return execSync('git diff HEAD~1 HEAD --name-only', { cwd: ROOT, encoding: 'utf-8' }).split('\n').map(s => s.trim()).filter(Boolean); }
  catch { try { return execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' }).split('\n').map(s => s.trim()).filter(Boolean); } catch { return []; } }
}

function getAllTrackedFiles(): string[] {
  try { return execSync('git ls-files', { cwd: ROOT, encoding: 'utf-8' }).split('\n').map(s => s.trim()).filter(Boolean); } catch { return []; }
}

function findMatches(content: string, pattern: RegExp | string): Array<{ line: number; snippet: string }> {
  const lines = content.split('\n');
  const matches: Array<{ line: number; snippet: string }> = [];
  for (let i = 0; i < lines.length; i++) {
    const trimmed = lines[i].trim();
    if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue;
    let found = false;
    if (typeof pattern === 'string') found = lines[i].includes(pattern);
    else { pattern.lastIndex = 0; found = pattern.test(lines[i]); }
    if (found) matches.push({ line: i + 1, snippet: trimmed.slice(0, 140) });
  }
  return matches;
}

function main() {
  const start = Date.now();
  const mode = process.argv.includes('--all') ? 'working-tree' : 'commit';
  const files = (mode === 'working-tree' ? getAllTrackedFiles() : getCommittedFiles()).filter(f => /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(f));

  const triggered = new Set<string>();
  const perFileLibs = new Map<string, Set<string>>();
  for (const f of files) {
    const libs = getLibrariesForFile(f);
    perFileLibs.set(f, libs);
    for (const l of libs) triggered.add(l);
  }

  const researchCacheFound: Record<string, boolean> = {};
  for (const id of triggered) researchCacheFound[id] = existsSync(join(RESEARCH_DIR, id, 'CURRENT.md'));

  const hits: DriftHit[] = [];
  for (const file of files) {
    const fileLibs = perFileLibs.get(file) ?? new Set<string>();
    if (fileLibs.size === 0) continue;
    const absPath = join(ROOT, file);
    let content: string;
    try { content = readFileSync(absPath, 'utf-8'); } catch { continue; }
    for (const rule of DRIFT_RULES.filter(r => fileLibs.has(r.library) && matchesGlob(file, r.filePattern))) {
      for (const m of findMatches(content, rule.pattern)) {
        hits.push({ rule: rule.id, library: rule.library, severity: rule.severity, file, line: m.line, snippet: m.snippet, message: rule.message, fix: rule.fix });
      }
    }
  }

  const report: DriftReport = { timestamp: new Date().toISOString(), mode, filesScanned: files.length, librariesTriggered: Array.from(triggered).sort(), hits, durationMs: Date.now() - start, researchCacheFound };

  mkdirSync(REPORTS_DIR, { recursive: true });
  const stamp = report.timestamp.replace(/[:.]/g, '-');
  writeFileSync(join(REPORTS_DIR, 'latest.json'), JSON.stringify(report, null, 2), 'utf-8');

  const DIM = '\x1b[2m'; const GREEN = '\x1b[32m'; const YELLOW = '\x1b[33m'; const RED = '\x1b[31m'; const RESET = '\x1b[0m';
  console.log(`\n  ${DIM}drift detection${RESET}`);
  console.log(`  files: ${files.length} | libraries: ${report.librariesTriggered.join(', ') || '(none)'} | ${(report.durationMs / 1000).toFixed(2)}s`);
  if (hits.length === 0) console.log(`  ${GREEN}no drift detected${RESET}`);
  else {
    const errs = hits.filter(h => h.severity === 'error').length;
    console.log(`  ${errs > 0 ? RED : YELLOW}${hits.length} hit(s)${RESET} (${errs} error, ${hits.length - errs} warning)`);
    for (const h of hits.slice(0, 10)) console.log(`    ${h.severity === 'error' ? `${RED}ERR${RESET}` : `${YELLOW}WRN${RESET}`} ${h.file}:${h.line}  ${DIM}${h.message}${RESET}`);
  }
  console.log('');
  process.exit(0);
}

main();
