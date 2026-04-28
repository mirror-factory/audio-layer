#!/usr/bin/env tsx

import { existsSync, mkdirSync, readFileSync, readdirSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

type Severity = 'error' | 'warning';

interface DesignDriftHit {
  rule: string;
  severity: Severity;
  file: string;
  line: number;
  snippet: string;
  message: string;
  fix: string;
}

interface DesignDriftReport {
  generatedAt: string;
  strict: boolean;
  scannedFiles: number;
  tokensLoaded: boolean;
  hits: DesignDriftHit[];
  blockingHits: DesignDriftHit[];
}

const ROOT = process.cwd();
const REPORT_PATH = resolve(ROOT, '.evidence/design-drift/latest.json');
const REPORT_MD_PATH = resolve(ROOT, '.evidence/design-drift/latest.md');

const SCAN_ROOTS = ['app', 'components', 'src/app', 'src/components'];
const FILE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.css']);
const GENERATED_ALLOWLIST = [
  'app/control-plane/page.tsx',
  'app/observability/page.tsx',
  'app/ai-starter/page.tsx',
  'components/ai-debug-panel.tsx',
  'components/ai-debug-panel.stories.tsx',
];

const RULES: Array<{
  id: string;
  severity: Severity;
  pattern: RegExp;
  message: string;
  fix: string;
}> = [
  {
    id: 'hardcoded-hex-color',
    severity: 'warning',
    pattern: /#[0-9a-fA-F]{3,8}\b/,
    message: 'Hardcoded hex colors bypass DESIGN.md and the design registry.',
    fix: 'Move the color into DESIGN.md/.ai-starter/manifests/design.json and reference a semantic token.',
  },
  {
    id: 'tailwind-arbitrary-color',
    severity: 'warning',
    pattern: /\b(?:bg|text|border|from|via|to|shadow)-\[#/i,
    message: 'Tailwind arbitrary colors are difficult for agents to keep consistent.',
    fix: 'Use semantic token classes/CSS variables instead of one-off arbitrary palette values.',
  },
  {
    id: 'inline-color-style',
    severity: 'warning',
    pattern: /\b(?:background|backgroundColor|color|borderColor|boxShadow)\s*:/,
    message: 'Inline visual styles are not visible to the token registry.',
    fix: 'Promote repeated visual values to DESIGN.md tokens or a shared component variant.',
  },
  {
    id: 'soft-radius-in-pixel-system',
    severity: 'warning',
    pattern: /\brounded-(?:xl|2xl|3xl|full|\[[^\]]+\])/,
    message: 'Large radii drift from the default black/white pixel design contract.',
    fix: 'Use the design registry radii (`none`, `chip`, `panel`) unless the surface has an explicit exception.',
  },
];

function extensionOf(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function readJson<T>(path: string, fallback: T): T {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function walk(dir: string): string[] {
  const full = resolve(ROOT, dir);
  if (!existsSync(full)) return [];

  const files: string[] = [];
  const visit = (current: string) => {
    let entries;
    try {
      entries = readdirSync(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.') || entry.name === 'node_modules') continue;
      const child = join(current, entry.name);
      if (entry.isDirectory()) {
        visit(child);
        continue;
      }
      if (!entry.isFile()) continue;
      const rel = relative(ROOT, child).replace(/\\/g, '/');
      if (GENERATED_ALLOWLIST.includes(rel)) continue;
      if (FILE_EXTENSIONS.has(extensionOf(rel))) files.push(rel);
    }
  };

  visit(full);
  return files;
}

function strictMode(): boolean {
  if (process.env.AI_STARTER_DESIGN_STRICT === '1') return true;
  const designMd = resolve(ROOT, 'DESIGN.md');
  if (!existsSync(designMd)) return false;
  const text = readFileSync(designMd, 'utf-8');
  return /design_drift:\s*(blocking|strict)/i.test(text);
}

function scanFile(relPath: string): DesignDriftHit[] {
  const fullPath = resolve(ROOT, relPath);
  const text = readFileSync(fullPath, 'utf-8');
  const hits: DesignDriftHit[] = [];
  const lines = text.split('\n');

  lines.forEach((line, index) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('//') || trimmed.startsWith('*')) return;

    for (const rule of RULES) {
      rule.pattern.lastIndex = 0;
      if (!rule.pattern.test(line)) continue;
      hits.push({
        rule: rule.id,
        severity: rule.severity,
        file: relPath,
        line: index + 1,
        snippet: trimmed.slice(0, 180),
        message: rule.message,
        fix: rule.fix,
      });
    }
  });

  return hits;
}

function main(): void {
  const strict = strictMode();
  const designRegistry = readJson<Record<string, unknown> | null>(
    resolve(ROOT, '.ai-starter/manifests/design.json'),
    null,
  );
  const files = Array.from(new Set(SCAN_ROOTS.flatMap(walk))).sort();
  const hits = files.flatMap(scanFile);
  const blockingHits = strict ? hits.filter(hit => hit.severity === 'warning' || hit.severity === 'error') : [];
  const report: DesignDriftReport = {
    generatedAt: new Date().toISOString(),
    strict,
    scannedFiles: files.length,
    tokensLoaded: Boolean(designRegistry),
    hits,
    blockingHits,
  };

  mkdirSync(dirname(REPORT_PATH), { recursive: true });
  writeFileSync(REPORT_PATH, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  writeFileSync(
    REPORT_MD_PATH,
    [
      '# Design Drift Report',
      '',
      `Generated: ${report.generatedAt}`,
      `Mode: ${strict ? 'blocking' : 'warning'}`,
      `Files scanned: ${report.scannedFiles}`,
      `Hits: ${hits.length}`,
      `Blocking hits: ${blockingHits.length}`,
      '',
      ...hits.slice(0, 50).map(hit => `- [${hit.severity}] ${hit.file}:${hit.line} ${hit.rule} — ${hit.message}`),
      hits.length > 50 ? `- ... and ${hits.length - 50} more` : '',
      '',
    ].filter(Boolean).join('\n'),
    'utf-8',
  );

  console.log(`design-drift=${blockingHits.length > 0 ? 'blocked' : hits.length > 0 ? 'warn' : 'pass'}`);
  console.log(`hits=${hits.length}`);
  console.log(`strict=${strict ? 'true' : 'false'}`);
  console.log('evidence=.evidence/design-drift/latest.json');

  if (blockingHits.length > 0) {
    process.exit(1);
  }
}

main();
