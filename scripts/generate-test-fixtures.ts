#!/usr/bin/env tsx
/**
 * Generate test fixture constants from a canonical tool-meta registry.
 *
 * Reads TOOL_META / TOOL_METADATA from a TypeScript source file using
 * the same AST extraction as generate-from-registry.ts, then outputs
 * a TypeScript file that tests can import instead of hardcoding values.
 *
 * Usage:
 *   tsx scripts/generate-test-fixtures.ts reference-app/lib/ai/tool-meta.ts
 *   tsx scripts/generate-test-fixtures.ts reference-app/lib/ai/tool-meta.ts --output reference-app/tests/generated/registry-fixtures.ts
 *   tsx scripts/generate-test-fixtures.ts --dry-run
 *
 * Output file contains:
 *   - VALID_CATEGORIES array
 *   - VALID_TYPES array
 *   - VALID_UI_VALUES array
 *   - ALL_TOOL_NAMES array
 *   - CATEGORY_LABELS map
 *   - TOOL_COUNT constant
 *
 * The generated file has a "DO NOT EDIT" header.
 */

import { resolve, dirname, basename } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { extractRegistryEntries, findDefaultSource } from './generate-from-registry';

// ── Fixture Generator ─────────────────────────────────────────────────

function generateFixtureFile(sourceFile: string, entries: Array<{
  name: string;
  label: string;
  description: string;
  type: string;
  ui: string;
  category: string;
}>): string {
  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))].sort();
  const types = [...new Set(entries.map(e => e.type).filter(Boolean))].sort();
  const uiValues = [...new Set(entries.map(e => e.ui).filter(Boolean))].sort();
  const toolNames = entries.map(e => e.name).sort();

  // Build CATEGORY_LABELS: { category: "Category" }
  const categoryLabels: Record<string, string> = {};
  for (const cat of categories) {
    categoryLabels[cat] = cat.charAt(0).toUpperCase() + cat.slice(1);
  }

  const lines: string[] = [
    `// DO NOT EDIT — generated from ${basename(sourceFile)} by generate-test-fixtures.ts`,
    '//',
    `// Source: ${sourceFile}`,
    `// Generated: ${new Date().toISOString().split('T')[0]}`,
    `// Tool count: ${entries.length}`,
    '',
    '/**',
    ' * Auto-generated test fixtures from the canonical tool registry.',
    ' * Import these in tests instead of hardcoding category names, types, etc.',
    ' *',
    ' * Regenerate: tsx scripts/generate-test-fixtures.ts ' + sourceFile,
    ' */',
    '',
    `export const VALID_CATEGORIES = ${JSON.stringify(categories)} as const;`,
    '',
    `export const VALID_TYPES = ${JSON.stringify(types)} as const;`,
    '',
    `export const VALID_UI_VALUES = ${JSON.stringify(uiValues)} as const;`,
    '',
    `export const ALL_TOOL_NAMES = ${JSON.stringify(toolNames)} as const;`,
    '',
    `export const CATEGORY_LABELS: Record<string, string> = ${JSON.stringify(categoryLabels, null, 2)};`,
    '',
    `export const TOOL_COUNT = ${entries.length};`,
    '',
    '// Derived types',
    'export type ToolCategory = typeof VALID_CATEGORIES[number];',
    'export type ToolType = typeof VALID_TYPES[number];',
    'export type ToolUI = typeof VALID_UI_VALUES[number];',
    'export type ToolName = typeof ALL_TOOL_NAMES[number];',
    '',
  ];

  return lines.join('\n');
}

// ── Main ──────────────────────────────────────────────────────────────

function main() {
  const rawArgs = process.argv.slice(2);
  const flags = new Set(rawArgs.filter(a => a.startsWith('--') && !a.includes('=')));
  const kvFlags = rawArgs
    .filter(a => a.startsWith('--') && a.includes('='))
    .reduce((acc, a) => {
      const eqIdx = a.indexOf('=');
      const key = a.slice(0, eqIdx);
      const val = a.slice(eqIdx + 1);
      acc[key] = val;
      return acc;
    }, {} as Record<string, string>);
  const positional = rawArgs.filter(a => !a.startsWith('--'));

  const dryRun = flags.has('--dry-run');

  // Find source file
  const sourceFile = positional[0] || findDefaultSource();
  if (!sourceFile) {
    console.error('No registry source file specified and none found at default locations.');
    console.error('');
    console.error('Usage: tsx scripts/generate-test-fixtures.ts [path-to-tool-meta.ts]');
    console.error('       tsx scripts/generate-test-fixtures.ts path/to/tool-meta.ts --output=path/to/output.ts');
    process.exit(1);
  }

  if (!existsSync(resolve(sourceFile))) {
    console.error(`Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  // Determine output path
  // Default: sibling to source in tests/generated/registry-fixtures.ts
  let outputPath = kvFlags['--output'] || null;
  if (!outputPath) {
    // Infer: if source is in reference-app/, put fixtures in reference-app/tests/generated/
    if (sourceFile.includes('reference-app')) {
      const refRoot = sourceFile.split('reference-app')[0] + 'reference-app';
      outputPath = `${refRoot}/tests/generated/registry-fixtures.ts`;
    } else {
      // Fallback: same directory structure
      const sourceDir = dirname(sourceFile);
      outputPath = `${sourceDir}/../../tests/generated/registry-fixtures.ts`;
    }
  }

  console.log(`\n  Test Fixture Generator\n`);
  console.log(`  Source: ${sourceFile}`);
  console.log(`  Output: ${outputPath}`);
  console.log('  ─────────────────────────────────────────────\n');

  // Extract entries
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

  console.log(`  Found ${entries.length} tool(s) in ${[...new Set(entries.map(e => e.category))].length} categories`);

  // Generate
  const content = generateFixtureFile(sourceFile, entries);

  if (dryRun) {
    console.log('\n--- DRY RUN ---\n');
    console.log(content);
    console.log('--- End DRY RUN ---');
    return;
  }

  // Write
  const fullOutputPath = resolve(outputPath);
  mkdirSync(dirname(fullOutputPath), { recursive: true });
  writeFileSync(fullOutputPath, content, 'utf-8');

  console.log(`\n  Wrote: ${outputPath} (${content.length} bytes)`);
  console.log(`  Categories: ${[...new Set(entries.map(e => e.category))].sort().join(', ')}`);
  console.log(`  Types: ${[...new Set(entries.map(e => e.type))].sort().join(', ')}`);
  console.log(`  UI values: ${[...new Set(entries.map(e => e.ui))].sort().join(', ')}`);
  console.log('');
}

main();
