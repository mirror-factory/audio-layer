#!/usr/bin/env tsx
/**
 * Validate that derived registry outputs match the canonical source.
 *
 * Runs the generator in dry-run mode, compares output against existing files,
 * and reports diffs. Exits non-zero if any file is stale (for CI).
 *
 * Usage:
 *   tsx scripts/validate-registry-sync.ts [path-to-tool-meta.ts]
 *   tsx scripts/validate-registry-sync.ts --output-dir docs/generated
 *   tsx scripts/validate-registry-sync.ts --verbose
 *
 * Exit codes:
 *   0 — all files in sync
 *   1 — at least one stale file (regenerate with generate-from-registry.ts)
 */

import { resolve, join, basename } from 'path';
import { readFileSync, existsSync } from 'fs';
import {
  extractRegistryEntries,
  generateMarkdownDoc,
  generateTestFixture,
  generateAgentsRegistry,
  findDefaultSource,
} from './generate-from-registry';
import type { GeneratedOutput } from './generate-from-registry';

// ── Diff Helpers ───────────────────────────────────────────────────────

interface DiffResult {
  path: string;
  status: 'match' | 'stale' | 'missing';
  addedLines: number;
  removedLines: number;
  firstDiffLine: number | null;
  preview: string;
}

/**
 * Compare two strings line-by-line and produce a simple diff summary.
 * Ignores the "Generated:" timestamp line for comparison purposes.
 */
function compareContent(expected: string, actual: string): Omit<DiffResult, 'path' | 'status'> {
  const normalize = (s: string) =>
    s.split('\n').filter(line => !line.startsWith('> Generated:')).join('\n');

  const expectedNorm = normalize(expected);
  const actualNorm = normalize(actual);

  if (expectedNorm === actualNorm) {
    return { addedLines: 0, removedLines: 0, firstDiffLine: null, preview: '' };
  }

  const expectedLines = expectedNorm.split('\n');
  const actualLines = actualNorm.split('\n');

  let firstDiffLine: number | null = null;
  let addedLines = 0;
  let removedLines = 0;
  const diffPreview: string[] = [];
  const maxPreviewLines = 15;

  const maxLen = Math.max(expectedLines.length, actualLines.length);

  for (let i = 0; i < maxLen; i++) {
    const exp = expectedLines[i] ?? undefined;
    const act = actualLines[i] ?? undefined;

    if (exp !== act) {
      if (firstDiffLine === null) firstDiffLine = i + 1;

      if (diffPreview.length < maxPreviewLines) {
        if (exp !== undefined && act === undefined) {
          diffPreview.push(`  +${i + 1}: ${exp}`);
          addedLines++;
        } else if (exp === undefined && act !== undefined) {
          diffPreview.push(`  -${i + 1}: ${act}`);
          removedLines++;
        } else {
          diffPreview.push(`  -${i + 1}: ${act}`);
          diffPreview.push(`  +${i + 1}: ${exp}`);
          addedLines++;
          removedLines++;
        }
      }
    }
  }

  if (addedLines + removedLines > maxPreviewLines) {
    diffPreview.push(`  ... and ${addedLines + removedLines - maxPreviewLines} more changed lines`);
  }

  return {
    addedLines,
    removedLines,
    firstDiffLine,
    preview: diffPreview.join('\n'),
  };
}

// ── Main ───────────────────────────────────────────────────────────────

function main() {
  const rawArgs = process.argv.slice(2);
  const flags = new Set(rawArgs.filter(a => a.startsWith('--') && !a.includes('=')));
  const kvFlags = rawArgs
    .filter(a => a.startsWith('--') && a.includes('='))
    .reduce((acc, a) => {
      const [key, val] = a.split('=');
      acc[key] = val;
      return acc;
    }, {} as Record<string, string>);
  const positional = rawArgs.filter(a => !a.startsWith('--'));

  const verbose = flags.has('--verbose');
  const outputDir = kvFlags['--output-dir'] || 'docs/generated';

  // Find source file
  const sourceFile = positional[0] || findDefaultSource();
  if (!sourceFile) {
    console.error('No registry source file specified and none found at default locations.');
    process.exit(1);
  }

  if (!existsSync(resolve(sourceFile))) {
    console.error(`Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  console.log('\n  Registry Sync Validator\n');
  console.log(`  Source: ${sourceFile}`);
  console.log(`  Output: ${outputDir}/`);
  console.log('  ─────────────────────────────────────────────\n');

  // Extract entries from source
  let entries;
  try {
    entries = extractRegistryEntries(sourceFile);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`  Failed to parse registry: ${message}`);
    process.exit(1);
  }

  if (entries.length === 0) {
    console.error('  No tool entries found in the registry.');
    process.exit(1);
  }

  // Generate expected content
  const expectedOutputs: GeneratedOutput[] = [
    {
      path: join(outputDir, 'tools.md'),
      content: generateMarkdownDoc(entries, sourceFile),
    },
    {
      path: join(outputDir, 'tool-registry-fixture.ts'),
      content: generateTestFixture(entries, sourceFile),
    },
    {
      path: join(outputDir, 'tools-compressed.md'),
      content: generateAgentsRegistry(entries, sourceFile),
    },
  ];

  // Compare each output against the existing file on disk
  const results: DiffResult[] = [];
  let hasFailure = false;

  for (const output of expectedOutputs) {
    const fullPath = resolve(output.path);
    const fileName = basename(output.path);

    if (!existsSync(fullPath)) {
      results.push({
        path: output.path,
        status: 'missing',
        addedLines: output.content.split('\n').length,
        removedLines: 0,
        firstDiffLine: 1,
        preview: `  File does not exist. Run: tsx scripts/generate-from-registry.ts`,
      });
      hasFailure = true;
      continue;
    }

    const existing = readFileSync(fullPath, 'utf-8');
    const diff = compareContent(output.content, existing);

    if (diff.firstDiffLine === null) {
      results.push({
        path: output.path,
        status: 'match',
        ...diff,
      });
    } else {
      results.push({
        path: output.path,
        status: 'stale',
        ...diff,
      });
      hasFailure = true;
    }
  }

  // Report results
  for (const result of results) {
    const icon = result.status === 'match'
      ? '\x1b[32m✓\x1b[0m'
      : result.status === 'missing'
        ? '\x1b[31m✗\x1b[0m'
        : '\x1b[33m!\x1b[0m';

    const label = result.status === 'match'
      ? 'in sync'
      : result.status === 'missing'
        ? 'MISSING'
        : `STALE (+${result.addedLines}/-${result.removedLines} lines, first diff at line ${result.firstDiffLine})`;

    console.log(`  ${icon}  ${basename(result.path)}  ${label}`);

    if (result.status !== 'match' && (verbose || result.status === 'missing')) {
      console.log(result.preview);
      console.log('');
    }
  }

  // Summary
  const inSync = results.filter(r => r.status === 'match').length;
  const stale = results.filter(r => r.status === 'stale').length;
  const missing = results.filter(r => r.status === 'missing').length;

  console.log('\n  ─────────────────────────────────────────────');
  console.log(`  ${inSync} in sync  ${stale} stale  ${missing} missing\n`);

  if (hasFailure) {
    console.log('  \x1b[31mRegistry sync check FAILED.\x1b[0m');
    console.log('  Regenerate with: tsx scripts/generate-from-registry.ts\n');
    process.exit(1);
  } else {
    console.log('  \x1b[32mAll derived files match the registry.\x1b[0m\n');
    process.exit(0);
  }
}

main();
