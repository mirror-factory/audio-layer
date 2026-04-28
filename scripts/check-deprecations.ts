#!/usr/bin/env tsx
/**
 * check-deprecations -- scan source for known-deprecated vendor API fields.
 *
 * Brittle on purpose: this is a hand-maintained list of field renames and
 * obsolete APIs that have already bitten real projects. It runs in
 * pre-commit (fast regex search) so the agent gets a warning the moment
 * it writes a deprecated call, instead of finding out when the server
 * returns 500.
 *
 * Adding to this list: when a vendor breaks you, add the old pattern here
 * with a link to the migration docs. Future you will thank past you.
 *
 * Exit codes:
 *   0 -- no deprecated patterns found
 *   1 -- at least one deprecation matched (prints file:line:pattern)
 */

import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

interface Deprecation {
  /** Pattern that matches the deprecated usage. Use string for literal, RegExp for more. */
  pattern: RegExp;
  /** Human-readable name of the vendor + what they changed. */
  vendor: string;
  /** Short fix instruction. */
  fix: string;
  /** URL to the vendor's migration notes. */
  url: string;
}

const DEPRECATIONS: Deprecation[] = [
  {
    vendor: 'AssemblyAI',
    pattern: /\bspeech_model\s*:/,
    fix: 'Rename `speech_model:` to `speech_models:` and pass an array of model names (e.g. ["universal-3-pro"]).',
    url: 'https://www.assemblyai.com/docs/pre-recorded-audio/select-the-speech-model',
  },
  {
    vendor: 'AI SDK',
    pattern: /\btoDataStreamResponse\s*\(/,
    fix: 'Use `toUIMessageStreamResponse()` instead of `toDataStreamResponse()` (AI SDK v6 rename).',
    url: 'https://sdk.vercel.ai/docs/migration-guides/migration-guide-5-0',
  },
  {
    vendor: 'AI SDK',
    pattern: /parameters:\s*z\./,
    fix: 'In AI SDK v6, tool definitions use `inputSchema:` not `parameters:`.',
    url: 'https://sdk.vercel.ai/docs/migration-guides/migration-guide-5-0',
  },
  {
    vendor: 'AI SDK',
    pattern: /addToolResult\s*\(/,
    fix: 'In AI SDK v6, the chat store method is `addToolOutput` not `addToolResult`.',
    url: 'https://sdk.vercel.ai/docs/migration-guides/migration-guide-5-0',
  },
  {
    vendor: 'AI SDK',
    pattern: /\bchat\.append\s*\(/,
    fix: 'AI SDK v6 renamed chat.append to chat.sendMessage. Review call sites.',
    url: 'https://sdk.vercel.ai/docs/migration-guides/migration-guide-5-0',
  },
];

const IGNORE_DIRS = new Set(['node_modules', '.next', '.git', 'dist', 'build', 'coverage', '.test-results']);
const SOURCE_EXT = ['.ts', '.tsx', '.js', '.jsx', '.mjs'];

function walk(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir)) {
    if (IGNORE_DIRS.has(entry)) continue;
    const full = join(dir, entry);
    const stat = statSync(full);
    if (stat.isDirectory()) walk(full, out);
    else if (SOURCE_EXT.some(ext => entry.endsWith(ext))) out.push(full);
  }
  return out;
}

function checkFile(file: string, rel: string): Array<{ vendor: string; line: number; match: string; fix: string; url: string }> {
  const content = readFileSync(file, 'utf-8');
  const lines = content.split('\n');
  const hits: Array<{ vendor: string; line: number; match: string; fix: string; url: string }> = [];
  for (const dep of DEPRECATIONS) {
    lines.forEach((line, idx) => {
      if (dep.pattern.test(line)) {
        hits.push({ vendor: dep.vendor, line: idx + 1, match: line.trim().slice(0, 100), fix: dep.fix, url: dep.url });
      }
    });
  }
  return hits;
}

function main(): void {
  const cwd = process.cwd();
  const roots = ['lib', 'app', 'components', 'src'].map(d => join(cwd, d)).filter(d => {
    try { return statSync(d).isDirectory(); } catch { return false; }
  });

  const files = roots.flatMap(r => walk(r));
  let anyHit = false;
  for (const file of files) {
    const rel = relative(cwd, file);
    const hits = checkFile(file, rel);
    for (const hit of hits) {
      if (!anyHit) {
        process.stdout.write('Deprecated vendor API usage detected:\n\n');
        anyHit = true;
      }
      process.stdout.write(`  ${rel}:${hit.line}  [${hit.vendor}]\n`);
      process.stdout.write(`    ${hit.match}\n`);
      process.stdout.write(`    Fix: ${hit.fix}\n`);
      process.stdout.write(`    See: ${hit.url}\n\n`);
    }
  }
  if (anyHit) process.exit(1);
  process.stdout.write('No deprecated patterns found.\n');
}

main();
