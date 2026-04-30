#!/usr/bin/env tsx

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, relative, resolve } from 'path';

interface Violation {
  file: string;
  line: number;
  kind: 'external-fetch' | 'provider-sdk' | 'image-generation' | 'browser-provider';
  message: string;
  evidence: string;
}

const ROOT = resolve(process.env.AI_STARTER_APP_DIR ?? process.cwd());
const EVIDENCE_DIR = join(ROOT, '.evidence');
const REPORT_JSON = join(EVIDENCE_DIR, 'integration-usage-scan.json');
const REPORT_TXT = join(EVIDENCE_DIR, 'integration-usage-scan.txt');

const SCAN_DIRS = [
  'app/api',
  'app/actions',
  'lib/ai',
  'lib/integrations',
  'lib/providers',
  'lib/services',
  'server',
];

const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx', '.mjs', '.cjs']);
const SKIP_DIRS = new Set([
  'node_modules',
  '.next',
  '.git',
  '.evidence',
  '.ai-starter',
  'dist',
  'build',
  'coverage',
  'storybook-static',
]);

const RECORDER_MARKERS = [
  'trackedFetch(',
  'recordApiUsage(',
  'recordIntegrationUsage(',
  'withExternalCall(',
];

const PROVIDER_IMPORTS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /from\s+['"]openai['"]|require\(['"]openai['"]\)/, label: 'OpenAI SDK' },
  { pattern: /from\s+['"]@anthropic-ai\/sdk['"]|require\(['"]@anthropic-ai\/sdk['"]\)/, label: 'Anthropic SDK' },
  { pattern: /from\s+['"]@google\/generative-ai['"]|require\(['"]@google\/generative-ai['"]\)/, label: 'Google Generative AI SDK' },
  { pattern: /from\s+['"]replicate['"]|require\(['"]replicate['"]\)/, label: 'Replicate SDK' },
  { pattern: /from\s+['"](?:@fal-ai\/client|fal-ai)['"]|require\(['"](?:@fal-ai\/client|fal-ai)['"]\)/, label: 'Fal SDK' },
  { pattern: /from\s+['"]assemblyai['"]|require\(['"]assemblyai['"]\)/, label: 'AssemblyAI SDK' },
  { pattern: /from\s+['"]@deepgram\/sdk['"]|require\(['"]@deepgram\/sdk['"]\)/, label: 'Deepgram SDK' },
  { pattern: /from\s+['"]elevenlabs['"]|require\(['"]elevenlabs['"]\)/, label: 'ElevenLabs SDK' },
  { pattern: /from\s+['"]firecrawl['"]|require\(['"]firecrawl['"]\)/, label: 'Firecrawl SDK' },
  { pattern: /from\s+['"]stripe['"]|require\(['"]stripe['"]\)/, label: 'Stripe SDK' },
  { pattern: /from\s+['"]resend['"]|require\(['"]resend['"]\)/, label: 'Resend SDK' },
];

const BROWSER_PROVIDER_PATTERNS: Array<{ pattern: RegExp; label: string }> = [
  { pattern: /@browserbasehq\/sdk|browserbase/i, label: 'Browserbase' },
  { pattern: /@browserbasehq\/stagehand|stagehand/i, label: 'Stagehand' },
  { pattern: /agent-browser/i, label: 'Agent Browser' },
];

function stripComments(content: string): string {
  return content
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '');
}

function extension(path: string): string {
  const match = path.match(/\.[^.]+$/);
  return match ? match[0] : '';
}

function walk(dir: string): string[] {
  if (!existsSync(dir)) return [];
  const files: string[] = [];
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    if (SKIP_DIRS.has(entry.name)) continue;
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...walk(full));
    if (entry.isFile() && SOURCE_EXTENSIONS.has(extension(entry.name))) files.push(full);
  }
  return files;
}

function lineNumber(content: string, index: number): number {
  return content.slice(0, Math.max(0, index)).split('\n').length;
}

function lineAt(content: string, line: number): string {
  return content.split('\n')[line - 1]?.trim() ?? '';
}

function hasRecorder(content: string): boolean {
  const scan = stripComments(content);
  return RECORDER_MARKERS.some(marker => scan.includes(marker));
}

function isAllowed(content: string): boolean {
  return content.includes('ai-starter-ignore integration-usage');
}

function hasExternalFetch(content: string, relPath: string): { index: number; evidence: string } | null {
  const scan = stripComments(content);
  const explicitUrl = /\bfetch\s*\(\s*['"`]https?:\/\//m.exec(scan);
  if (explicitUrl) {
    return { index: explicitUrl.index, evidence: explicitUrl[0] };
  }

  const integrationPath = /(^|\/)lib\/(ai|integrations|providers|services)\//.test(relPath);
  if (!integrationPath) return null;

  const indirectFetch = /\bfetch\s*\(/m.exec(scan);
  if (!indirectFetch) return null;
  return { index: indirectFetch.index, evidence: indirectFetch[0] };
}

function providerImport(content: string): { index: number; label: string; evidence: string } | null {
  const scan = stripComments(content);
  for (const provider of PROVIDER_IMPORTS) {
    const match = provider.pattern.exec(scan);
    if (match) return { index: match.index, label: provider.label, evidence: match[0] };
  }
  return null;
}

function imageCall(content: string): { index: number; evidence: string } | null {
  const scan = stripComments(content);
  const match = /\b(?:generateImage|experimental_generateImage)\s*\(/m.exec(scan);
  if (!match) return null;
  return { index: match.index, evidence: match[0] };
}

function browserProvider(content: string): { index: number; label: string; evidence: string } | null {
  const scan = stripComments(content);
  for (const provider of BROWSER_PROVIDER_PATTERNS) {
    const match = provider.pattern.exec(scan);
    if (match) return { index: match.index, label: provider.label, evidence: match[0] };
  }
  return null;
}

function scanFile(file: string): Violation[] {
  const content = readFileSync(file, 'utf-8');
  const relPath = relative(ROOT, file);
  if (isAllowed(content) || hasRecorder(content)) return [];

  const violations: Violation[] = [];
  const fetchHit = hasExternalFetch(content, relPath);
  if (fetchHit) {
    const line = lineNumber(stripComments(content), fetchHit.index);
    violations.push({
      file: relPath,
      line,
      kind: 'external-fetch',
      message: 'External fetch must use trackedFetch() or call recordApiUsage()/recordIntegrationUsage().',
      evidence: lineAt(content, line) || fetchHit.evidence,
    });
  }

  const providerHit = providerImport(content);
  if (providerHit) {
    const line = lineNumber(stripComments(content), providerHit.index);
    violations.push({
      file: relPath,
      line,
      kind: 'provider-sdk',
      message: `${providerHit.label} usage must record quantity/cost with recordApiUsage(), trackedFetch(), or withExternalCall().`,
      evidence: lineAt(content, line) || providerHit.evidence,
    });
  }

  const imageHit = imageCall(content);
  if (imageHit) {
    const line = lineNumber(stripComments(content), imageHit.index);
    violations.push({
      file: relPath,
      line,
      kind: 'image-generation',
      message: 'Image generation must record image count/cost with recordApiUsage() or recordIntegrationUsage().',
      evidence: lineAt(content, line) || imageHit.evidence,
    });
  }

  const browserHit = browserProvider(content);
  if (browserHit) {
    const line = lineNumber(stripComments(content), browserHit.index);
    violations.push({
      file: relPath,
      line,
      kind: 'browser-provider',
      message: `${browserHit.label} usage must record session/action count and cost with recordApiUsage() or recordIntegrationUsage().`,
      evidence: lineAt(content, line) || browserHit.evidence,
    });
  }

  return violations;
}

function main(): void {
  const files = SCAN_DIRS.flatMap(dir => walk(join(ROOT, dir)));
  const violations = files.flatMap(scanFile);
  const report = {
    generatedAt: new Date().toISOString(),
    root: ROOT,
    scannedFiles: files.map(file => relative(ROOT, file)).sort(),
    violationCount: violations.length,
    violations,
    requiredRecorderMarkers: RECORDER_MARKERS,
    allowComment: 'ai-starter-ignore integration-usage',
  };

  mkdirSync(dirname(REPORT_JSON), { recursive: true });
  writeFileSync(REPORT_JSON, JSON.stringify(report, null, 2) + '\n', 'utf-8');
  writeFileSync(
    REPORT_TXT,
    [
      'Integration Usage Scan',
      '======================',
      '',
      `Root: ${ROOT}`,
      `Scanned files: ${files.length}`,
      `Violations: ${violations.length}`,
      '',
      ...violations.map(hit => `${hit.file}:${hit.line} [${hit.kind}] ${hit.message}\n  ${hit.evidence}`),
      '',
      'Fix: wrap external calls with trackedFetch(), recordApiUsage(), recordIntegrationUsage(), or withExternalCall().',
    ].join('\n'),
    'utf-8',
  );

  console.log(`integration-usage-scan=${violations.length === 0 ? 'pass' : 'fail'}`);
  console.log(`scanned=${files.length}`);
  console.log(`violations=${violations.length}`);
  console.log('evidence=.evidence/integration-usage-scan.json');

  if (violations.length > 0) {
    for (const violation of violations.slice(0, 12)) {
      console.error(`${violation.file}:${violation.line} ${violation.message}`);
    }
    process.exit(1);
  }
}

main();
