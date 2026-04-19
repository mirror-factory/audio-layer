/**
 * Schema Drift Detection Script
 *
 * Reads the tool registry and compares each tool's inputSchema against
 * saved snapshots in `.schema-snapshots/`. Reports any drift detected.
 *
 * Usage:
 *   npx tsx scripts/check-schema-drift.ts            # Check for drift
 *   npx tsx scripts/check-schema-drift.ts --update    # Update snapshots
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'fs';
import { join, basename } from 'path';
import { createHash } from 'crypto';

const SNAPSHOTS_DIR = join(process.cwd(), '.schema-snapshots');
const REGISTRY_PATHS = [
  join(process.cwd(), 'templates', '_registry.ts'),
  join(process.cwd(), 'lib', 'tool-registry.ts'),
  join(process.cwd(), 'tool-registry.ts'),
  join(process.cwd(), '.registry', 'tools.json'),
];

const shouldUpdate = process.argv.includes('--update');

interface ToolDefinition {
  name: string;
  inputSchema: Record<string, unknown>;
}

function hashSchema(schema: Record<string, unknown>): string {
  const serialized = JSON.stringify(schema, Object.keys(schema).sort(), 2);
  return createHash('sha256').update(serialized).digest('hex');
}

function loadRegistry(): ToolDefinition[] {
  // Try JSON registry first
  const jsonPath = REGISTRY_PATHS.find(
    (p) => p.endsWith('.json') && existsSync(p)
  );

  if (jsonPath) {
    try {
      const content = readFileSync(jsonPath, 'utf-8');
      const data = JSON.parse(content);
      const tools: ToolDefinition[] = Array.isArray(data) ? data : data.tools || [];
      return tools.filter((t) => t.name && t.inputSchema);
    } catch {
      // Fall through to other methods
    }
  }

  // Try to find any exported tools from TypeScript registry files
  for (const registryPath of REGISTRY_PATHS) {
    if (registryPath.endsWith('.ts') && existsSync(registryPath)) {
      try {
        const content = readFileSync(registryPath, 'utf-8');
        // Simple extraction: look for JSON-like inputSchema blocks
        const toolMatches = content.matchAll(
          /name:\s*['"]([^'"]+)['"][\s\S]*?inputSchema:\s*(\{[\s\S]*?\})\s*(?:,\s*(?:description|execute|handler)|}\s*(?:,|\]))/g
        );

        const tools: ToolDefinition[] = [];
        for (const match of toolMatches) {
          try {
            const name = match[1];
            const schemaStr = match[2];
            const schema = JSON.parse(schemaStr);
            tools.push({ name, inputSchema: schema });
          } catch {
            // Skip malformed entries
          }
        }

        if (tools.length > 0) return tools;
      } catch {
        // Fall through
      }
    }
  }

  return [];
}

function ensureSnapshotsDir(): void {
  if (!existsSync(SNAPSHOTS_DIR)) {
    mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    console.log(`Created snapshots directory: ${SNAPSHOTS_DIR}`);
  }
}

function getSnapshotPath(toolName: string): string {
  const safeName = toolName.replace(/[^a-zA-Z0-9_-]/g, '_');
  return join(SNAPSHOTS_DIR, `${safeName}.schema.json`);
}

function checkDrift(): void {
  ensureSnapshotsDir();

  const tools = loadRegistry();

  if (tools.length === 0) {
    console.log('No tools found in registry. Nothing to check.');
    process.exit(0);
  }

  console.log(`Checking ${tools.length} tool(s) for schema drift...\n`);

  let driftCount = 0;
  let newCount = 0;

  for (const tool of tools) {
    const snapshotPath = getSnapshotPath(tool.name);
    const currentHash = hashSchema(tool.inputSchema);

    if (!existsSync(snapshotPath)) {
      if (shouldUpdate) {
        writeFileSync(snapshotPath, JSON.stringify(tool.inputSchema, null, 2));
        console.log(`  [NEW] ${tool.name} -- snapshot created`);
      } else {
        console.log(`  [NEW] ${tool.name} -- no snapshot exists (run with --update to create)`);
      }
      newCount++;
      continue;
    }

    try {
      const savedSchema = JSON.parse(readFileSync(snapshotPath, 'utf-8'));
      const savedHash = hashSchema(savedSchema);

      if (currentHash !== savedHash) {
        driftCount++;
        console.log(`  [DRIFT] ${tool.name} -- schema has changed since last snapshot`);

        if (shouldUpdate) {
          writeFileSync(snapshotPath, JSON.stringify(tool.inputSchema, null, 2));
          console.log(`          Updated snapshot for ${tool.name}`);
        }
      } else {
        console.log(`  [OK] ${tool.name}`);
      }
    } catch {
      console.log(`  [ERROR] ${tool.name} -- could not read snapshot`);
      driftCount++;
    }
  }

  // Check for orphaned snapshots (tools that no longer exist)
  const existingSnapshots = existsSync(SNAPSHOTS_DIR)
    ? readdirSync(SNAPSHOTS_DIR).filter((f) => f.endsWith('.schema.json'))
    : [];
  const toolNames = new Set(
    tools.map((t) => t.name.replace(/[^a-zA-Z0-9_-]/g, '_'))
  );
  const orphaned = existingSnapshots.filter(
    (f) => !toolNames.has(basename(f, '.schema.json'))
  );

  if (orphaned.length > 0) {
    console.log(`\n  Orphaned snapshots (tool no longer in registry):`);
    for (const f of orphaned) {
      console.log(`    - ${f}`);
    }
  }

  // Summary
  console.log('\n--- Schema Drift Summary ---');
  console.log(`  Tools checked: ${tools.length}`);
  console.log(`  New (no snapshot): ${newCount}`);
  console.log(`  Drift detected: ${driftCount}`);
  console.log(`  Orphaned snapshots: ${orphaned.length}`);

  if (driftCount > 0 && !shouldUpdate) {
    console.log('\nSchema drift detected. Run with --update to accept changes:');
    console.log('  npx tsx scripts/check-schema-drift.ts --update');
    process.exit(1);
  }

  if (shouldUpdate) {
    console.log('\nSnapshots updated successfully.');
  }
}

checkDrift();
