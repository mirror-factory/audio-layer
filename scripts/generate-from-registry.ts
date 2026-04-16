#!/usr/bin/env tsx
/**
 * Generate derived files from the canonical tool-meta registry.
 *
 * Reads a TOOL_META or TOOL_METADATA export from a TypeScript file using
 * ts-morph AST parsing, then generates:
 *   a. docs/generated/tools.md — markdown reference doc
 *   b. A test fixture with valid category values
 *   c. Compressed pipe-delimited registry for AGENTS.md
 *
 * Each output includes a "DO NOT EDIT" header.
 *
 * Usage:
 *   tsx scripts/generate-from-registry.ts [path-to-tool-meta.ts]
 *   tsx scripts/generate-from-registry.ts --dry-run
 *   tsx scripts/generate-from-registry.ts --output-dir docs/generated
 *
 * Defaults:
 *   Source: templates/_metadata.ts (or first file matching *tool-meta*.ts / *_metadata*.ts)
 *   Output: docs/generated/
 */

import { Project, Node, ObjectLiteralExpression } from 'ts-morph';
import { resolve, basename, join } from 'path';
import { writeFileSync, mkdirSync, existsSync } from 'fs';

// ── Types ──────────────────────────────────────────────────────────────

interface RegistryEntry {
  name: string;
  label: string;
  description: string;
  type: string;
  ui: string;
  category: string;
  // Additional fields from the starter kit _metadata.ts format
  service: string;
  access: string;
  clientSide: boolean;
}

interface GeneratedOutput {
  path: string;
  content: string;
}

// ── AST Extraction ─────────────────────────────────────────────────────

/**
 * Read a string property from an object literal expression.
 */
function readStringProp(obj: ObjectLiteralExpression, propName: string): string {
  const prop = obj.getProperty(propName);
  if (!prop || !Node.isPropertyAssignment(prop)) return '';

  const init = prop.getInitializer();
  if (!init) return '';

  // Handle `'value' as const` pattern
  if (Node.isAsExpression(init)) {
    const inner = init.getExpression();
    if (Node.isStringLiteral(inner)) return inner.getLiteralValue();
  }

  if (Node.isStringLiteral(init)) return init.getLiteralValue();
  if (Node.isNoSubstitutionTemplateLiteral(init)) return init.getLiteralValue();

  return '';
}

/**
 * Read a boolean property from an object literal expression.
 */
function readBooleanProp(obj: ObjectLiteralExpression, propName: string): boolean {
  const prop = obj.getProperty(propName);
  if (!prop || !Node.isPropertyAssignment(prop)) return false;

  const init = prop.getInitializer();
  if (!init) return false;

  if (Node.isTrueLiteral(init)) return true;
  if (Node.isFalseLiteral(init)) return false;

  return false;
}

/**
 * Unwrap common wrapper expressions so exported registries can use
 * `as const`, parentheses, or type assertions without breaking AST extraction.
 */
function unwrapInitializer(node: Node): Node {
  let current = node;

  while (
    Node.isAsExpression(current) ||
    Node.isParenthesizedExpression(current) ||
    Node.isTypeAssertion(current) ||
    Node.isSatisfiesExpression(current)
  ) {
    if (Node.isAsExpression(current) || Node.isSatisfiesExpression(current)) {
      current = current.getExpression();
      continue;
    }

    if (Node.isParenthesizedExpression(current) || Node.isTypeAssertion(current)) {
      current = current.getExpression();
      continue;
    }
  }

  return current;
}

/**
 * Extract all entries from a TOOL_META / TOOL_METADATA export.
 *
 * Supports two formats:
 *
 * Format A (Brand Studio — object with named keys):
 *   export const TOOL_META = {
 *     searchDocuments: { label: 'Search', description: '...', type: 'server', ui: 'custom', category: 'search' },
 *   };
 *
 * Format B (Starter Kit — array of objects with `name` field):
 *   export const TOOL_METADATA: ToolMetadata[] = [
 *     { name: 'search_docs', category: 'search', ... },
 *   ];
 */
function extractRegistryEntries(filePath: string): RegistryEntry[] {
  const project = new Project({
    compilerOptions: { allowJs: true, noEmit: true, strict: false, skipLibCheck: true },
    skipAddingFilesFromTsConfig: true,
  });

  const absolutePath = resolve(filePath);
  const sourceFile = project.addSourceFileAtPath(absolutePath);
  const entries: RegistryEntry[] = [];

  // Find the exported variable declaration
  const exportedDecls = sourceFile.getVariableDeclarations().filter(d => {
    const name = d.getName();
    return name === 'TOOL_META' || name === 'TOOL_METADATA';
  });

  if (exportedDecls.length === 0) {
    throw new Error(
      `No TOOL_META or TOOL_METADATA export found in ${filePath}. ` +
      `Expected: export const TOOL_META = { ... } or export const TOOL_METADATA = [ ... ]`
    );
  }

  const decl = exportedDecls[0];
  const init = decl.getInitializer();
  if (!init) throw new Error(`${decl.getName()} has no initializer`);
  const registryNode = unwrapInitializer(init);

  // Format A: Object literal with named tool keys
  if (Node.isObjectLiteralExpression(registryNode)) {
    for (const prop of registryNode.getProperties()) {
      if (!Node.isPropertyAssignment(prop)) continue;

      const toolName = prop.getName();
      const value = prop.getInitializer();
      if (!value || !Node.isObjectLiteralExpression(value)) continue;

      entries.push({
        name: toolName,
        label: readStringProp(value, 'label') || toolName,
        description: readStringProp(value, 'description'),
        type: readStringProp(value, 'type') || 'server',
        ui: readStringProp(value, 'ui') || 'silent',
        category: readStringProp(value, 'category') || 'general',
        service: readStringProp(value, 'service'),
        access: readStringProp(value, 'access'),
        clientSide: readBooleanProp(value, 'clientSide'),
      });
    }
  }

  // Format B: Array literal with { name: '...' } entries
  if (Node.isArrayLiteralExpression(registryNode)) {
    for (const element of registryNode.getElements()) {
      if (!Node.isObjectLiteralExpression(element)) continue;

      const name = readStringProp(element, 'name');
      if (!name) continue;

      entries.push({
        name,
        label: readStringProp(element, 'label') || name,
        description: readStringProp(element, 'description'),
        type: readStringProp(element, 'type') || (readBooleanProp(element, 'clientSide') ? 'client' : 'server'),
        ui: readStringProp(element, 'ui') || 'silent',
        category: readStringProp(element, 'category') || 'general',
        service: readStringProp(element, 'service'),
        access: readStringProp(element, 'access'),
        clientSide: readBooleanProp(element, 'clientSide'),
      });
    }
  }

  return entries;
}

// ── Generators ─────────────────────────────────────────────────────────

const HEADER = (sourceFile: string) =>
  `<!-- DO NOT EDIT — generated from ${basename(sourceFile)} by generate-from-registry.ts -->`;

const TS_HEADER = (sourceFile: string) =>
  `// DO NOT EDIT — generated from ${basename(sourceFile)} by generate-from-registry.ts`;

/**
 * Generate markdown reference doc grouped by category.
 */
function generateMarkdownDoc(entries: RegistryEntry[], sourceFile: string): string {
  const grouped = new Map<string, RegistryEntry[]>();
  for (const entry of entries) {
    const cat = entry.category || 'uncategorized';
    if (!grouped.has(cat)) grouped.set(cat, []);
    grouped.get(cat)!.push(entry);
  }

  const lines: string[] = [
    HEADER(sourceFile),
    '',
    '# Tool Registry Reference',
    '',
    `> Generated: ${new Date().toISOString().split('T')[0]}`,
    `> Source: \`${sourceFile}\``,
    `> Total: ${entries.length} tools across ${grouped.size} categories`,
    '',
    '---',
    '',
  ];

  const sortedCategories = [...grouped.keys()].sort();

  // Table of contents
  lines.push('## Categories', '');
  for (const cat of sortedCategories) {
    const count = grouped.get(cat)!.length;
    const anchor = cat.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    lines.push(`- [${capitalize(cat)}](#${anchor}) (${count})`);
  }
  lines.push('', '---', '');

  // Category sections
  for (const cat of sortedCategories) {
    const tools = grouped.get(cat)!;
    lines.push(`## ${capitalize(cat)}`, '');
    lines.push('| Tool | Type | UI | Description |');
    lines.push('|------|------|-----|-------------|');

    for (const t of tools) {
      const typeLabel = t.type || t.service || '—';
      const uiLabel = t.ui || (t.clientSide ? 'interactive' : '—');
      lines.push(`| \`${t.name}\` | ${typeLabel} | ${uiLabel} | ${t.description} |`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

/**
 * Generate a test fixture with valid category values.
 */
function generateTestFixture(entries: RegistryEntry[], sourceFile: string): string {
  const categories = [...new Set(entries.map(e => e.category).filter(Boolean))].sort();
  const types = [...new Set(entries.map(e => e.type).filter(Boolean))].sort();
  const uiValues = [...new Set(entries.map(e => e.ui).filter(Boolean))].sort();
  const services = [...new Set(entries.map(e => e.service).filter(Boolean))].sort();
  const toolNames = entries.map(e => e.name).sort();

  const lines: string[] = [
    TS_HEADER(sourceFile),
    '',
    '/**',
    ' * Auto-generated test fixture from tool registry.',
    ' * Import these constants in your tests instead of hardcoding values.',
    ' */',
    '',
    `export const VALID_CATEGORIES = ${JSON.stringify(categories)} as const;`,
    '',
    `export const VALID_TYPES = ${JSON.stringify(types)} as const;`,
    '',
    `export const VALID_UI_VALUES = ${JSON.stringify(uiValues)} as const;`,
    '',
    `export const VALID_SERVICES = ${JSON.stringify(services)} as const;`,
    '',
    `export const ALL_TOOL_NAMES = ${JSON.stringify(toolNames)} as const;`,
    '',
    `export const TOOL_COUNT = ${entries.length};`,
    '',
    `export type ToolCategory = typeof VALID_CATEGORIES[number];`,
    '',
    `export type ToolName = typeof ALL_TOOL_NAMES[number];`,
    '',
  ];

  return lines.join('\n');
}

/**
 * Generate compressed pipe-delimited registry for AGENTS.md.
 * Format: name|type|category|description (one per line)
 */
function generateAgentsRegistry(entries: RegistryEntry[], sourceFile: string): string {
  const lines: string[] = [
    HEADER(sourceFile),
    '',
    '## Tool Registry (Compressed)',
    '',
    '```',
    '# name|type|category|description',
  ];

  for (const entry of entries) {
    const type = entry.type || (entry.clientSide ? 'client' : 'server');
    lines.push(`${entry.name}|${type}|${entry.category}|${entry.description}`);
  }

  lines.push('```', '');

  return lines.join('\n');
}

// ── Helpers ────────────────────────────────────────────────────────────

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/**
 * Find the default registry source file.
 */
function findDefaultSource(): string | null {
  const candidates = [
    'templates/_metadata.ts',
    'lib/ai/tool-meta.ts',
    'src/lib/ai/tool-meta.ts',
    'src/lib/ai/tools/_metadata.ts',
    'lib/ai/tools/_metadata.ts',
  ];

  for (const candidate of candidates) {
    if (existsSync(resolve(candidate))) return candidate;
  }
  return null;
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

  const dryRun = flags.has('--dry-run');
  const outputDir = kvFlags['--output-dir'] || 'docs/generated';

  // Find source file
  const sourceFile = positional[0] || findDefaultSource();
  if (!sourceFile) {
    console.error('No registry source file specified and none found at default locations.');
    console.error('');
    console.error('Usage: tsx scripts/generate-from-registry.ts [path-to-tool-meta.ts]');
    console.error('');
    console.error('Searched: templates/_metadata.ts, lib/ai/tool-meta.ts, src/lib/ai/tool-meta.ts');
    process.exit(1);
  }

  if (!existsSync(resolve(sourceFile))) {
    console.error(`Source file not found: ${sourceFile}`);
    process.exit(1);
  }

  console.log(`Reading registry from: ${sourceFile}`);

  // Extract entries
  const entries = extractRegistryEntries(sourceFile);
  if (entries.length === 0) {
    console.error('No tool entries found in the registry.');
    process.exit(1);
  }

  console.log(`Found ${entries.length} tool(s) in ${[...new Set(entries.map(e => e.category))].length} categories`);

  // Generate outputs
  const outputs: GeneratedOutput[] = [
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

  // Write or preview
  if (dryRun) {
    console.log('\n--- DRY RUN — would generate: ---\n');
    for (const output of outputs) {
      console.log(`  ${output.path} (${output.content.length} bytes)`);
      console.log('  ' + '-'.repeat(60));
      // Show first 10 lines
      const preview = output.content.split('\n').slice(0, 10).map(l => `  ${l}`).join('\n');
      console.log(preview);
      console.log('  ...\n');
    }
    console.log('--- End DRY RUN ---');
  } else {
    mkdirSync(resolve(outputDir), { recursive: true });

    for (const output of outputs) {
      const fullPath = resolve(output.path);
      writeFileSync(fullPath, output.content);
      console.log(`  Wrote: ${output.path} (${output.content.length} bytes)`);
    }

    console.log(`\nGenerated ${outputs.length} files in ${outputDir}/`);
  }

  // Return outputs for programmatic use (validate-registry-sync imports this)
  return outputs;
}

// Export for programmatic use
export { extractRegistryEntries, generateMarkdownDoc, generateTestFixture, generateAgentsRegistry, findDefaultSource };
export type { RegistryEntry, GeneratedOutput };

// Only run main() when this file is the entry point (not when imported)
const isMainModule = process.argv[1]?.includes('generate-from-registry');
if (isMainModule) {
  main();
}
