#!/usr/bin/env tsx
/**
 * Gate Runner — Behavioral gates for the Vercel AI Starter Kit.
 *
 * Unlike the compliance checker (file-presence checks), gates verify
 * that things actually *work*: installs succeed, types check, tests pass,
 * registries stay in sync, telemetry is wired, and docs are fresh.
 *
 * Each gate produces an artifact file in .evidence/ so CI and humans
 * can inspect exactly what happened.
 *
 * Run: `tsx scripts/gates.ts`
 *
 * Exit codes:
 *   0 — all gates passed
 *   1 — at least one gate failed
 */

import { execSync } from 'child_process';
import { writeFileSync, mkdirSync, readFileSync, existsSync, readdirSync } from 'fs';
import { join, resolve } from 'path';

// ── Types ─────────────────────────────────────────────────────────────

interface Gate {
  name: string;
  description: string;
  required: boolean; // true = exit 1 on failure, false = warn only
  run: () => Promise<GateResult>;
  artifact?: string; // path to artifact this gate produces
}

interface GateResult {
  pass: boolean;
  message: string;
  artifact?: string; // path to evidence file
  details?: string[];
}

interface GateSummary {
  gate: string;
  required: boolean;
  pass: boolean;
  message: string;
  artifact: string | null;
  durationMs: number;
  details: string[];
}

// ── Config ────────────────────────────────────────────────────────────

const ROOT = resolve(__dirname, '..');
const DEFAULT_APP = join(ROOT, 'reference-app');
const APP_DIR = existsSync(join(process.cwd(), 'package.json'))
  ? resolve(process.cwd())
  : resolve(process.env.STARTER_APP_DIR ?? DEFAULT_APP);
const EVIDENCE_DIR = join(APP_DIR, '.evidence');

// ── Helpers ───────────────────────────────────────────────────────────

function ensureEvidenceDir() {
  mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function writeEvidence(filename: string, content: string): string {
  const filepath = join(EVIDENCE_DIR, filename);
  writeFileSync(filepath, content, 'utf-8');
  return `${APP_DIR.replace(ROOT + '/', '')}/.evidence/${filename}`;
}

function readPackageScripts(cwd: string): Record<string, string> {
  const packageJsonPath = join(cwd, 'package.json');
  if (!existsSync(packageJsonPath)) return {};
  try {
    const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
    return pkg.scripts ?? {};
  } catch {
    return {};
  }
}

function runCommand(cmd: string, cwd: string): { exitCode: number; stdout: string; stderr: string } {
  try {
    const stdout = execSync(cmd, {
      cwd,
      encoding: 'utf-8',
      stdio: ['pipe', 'pipe', 'pipe'],
      timeout: 120_000,
    });
    return { exitCode: 0, stdout, stderr: '' };
  } catch (err: unknown) {
    const e = err as { status?: number; stdout?: string; stderr?: string };
    return {
      exitCode: e.status ?? 1,
      stdout: e.stdout ?? '',
      stderr: e.stderr ?? '',
    };
  }
}

/**
 * Recursively walk a directory and return files matching a predicate.
 */
function walkFiles(dir: string, predicate: (name: string) => boolean): string[] {
  const results: string[] = [];
  if (!existsSync(dir)) return results;

  function walk(d: string) {
    const entries = readdirSync(d, { withFileTypes: true });
    for (const entry of entries) {
      const full = join(d, entry.name);
      if (entry.isDirectory()) {
        if (['node_modules', '.next', '.git', '.evidence'].includes(entry.name)) continue;
        walk(full);
      } else if (entry.isFile() && predicate(entry.name)) {
        results.push(full);
      }
    }
  }

  walk(dir);
  return results;
}

// ── Gates ─────────────────────────────────────────────────────────────

const gates: Gate[] = [
  // ─── a. Install ────────────────────────────────────────────────────
  {
    name: 'install',
    description: 'pnpm install --frozen-lockfile succeeds in the target app',
    required: true,
    artifact: '.evidence/install.log',
    run: async (): Promise<GateResult> => {
      const { exitCode, stdout, stderr } = runCommand('pnpm install --frozen-lockfile', APP_DIR);
      const log = `$ pnpm install --frozen-lockfile\n\n${stdout}\n${stderr}`.trim();
      const artifact = writeEvidence('install.log', log);

      if (exitCode !== 0) {
        return {
          pass: false,
          message: `pnpm install failed (exit ${exitCode})`,
          artifact,
          details: stderr.split('\n').filter(Boolean).slice(0, 10),
        };
      }

      return { pass: true, message: 'Dependencies installed successfully', artifact };
    },
  },

  // ─── b. Typecheck ──────────────────────────────────────────────────
  {
    name: 'typecheck',
    description: 'pnpm typecheck passes in the target app',
    required: true,
    artifact: '.evidence/typecheck.log',
    run: async (): Promise<GateResult> => {
      const { exitCode, stdout, stderr } = runCommand('pnpm typecheck', APP_DIR);
      const log = `$ pnpm typecheck\n\n${stdout}\n${stderr}`.trim();
      const artifact = writeEvidence('typecheck.log', log);

      if (exitCode !== 0) {
        // Extract the actual type errors for details
        const combined = stdout + '\n' + stderr;
        const errorLines = combined.split('\n').filter(l =>
          l.includes('error TS') || l.includes('): error')
        );

        return {
          pass: false,
          message: `TypeScript check failed (${errorLines.length} error(s))`,
          artifact,
          details: errorLines.slice(0, 15),
        };
      }

      return { pass: true, message: 'All types check out', artifact };
    },
  },

  // ─── c. Unit Tests ─────────────────────────────────────────────────
  {
    name: 'unit-tests',
    description: 'pnpm test passes in the target app',
    required: true,
    artifact: '.evidence/test-results.json',
    run: async (): Promise<GateResult> => {
      // Run vitest with JSON reporter for structured output
      const { exitCode, stdout, stderr } = runCommand(
        'pnpm test -- --reporter=json 2>&1 || true',
        APP_DIR,
      );

      // Try to extract JSON from the output
      let jsonResult: string = stdout;
      try {
        // vitest JSON reporter outputs JSON to stdout
        const jsonMatch = stdout.match(/\{[\s\S]*"testResults"[\s\S]*\}/);
        if (jsonMatch) {
          jsonResult = jsonMatch[0];
        }
      } catch {
        // Fall through — save raw output
      }

      const artifact = writeEvidence('test-results.json', jsonResult);

      // Re-run to get the actual exit code cleanly
      const { exitCode: realCode, stdout: realOut, stderr: realErr } = runCommand(
        'pnpm test',
        APP_DIR,
      );

      if (realCode !== 0) {
        const combined = realOut + '\n' + realErr;
        const failLines = combined.split('\n').filter(l =>
          l.includes('FAIL') || l.includes('AssertionError') || l.includes('✗') || l.includes('×')
        );

        return {
          pass: false,
          message: `Unit tests failed (exit ${realCode})`,
          artifact,
          details: failLines.slice(0, 10),
        };
      }

      // Count passing tests from output
      const passMatch = (realOut + realErr).match(/(\d+)\s+pass/i);
      const passCount = passMatch ? passMatch[1] : '?';

      return { pass: true, message: `All ${passCount} test(s) passed`, artifact };
    },
  },

  // ─── d. Registry Drift ─────────────────────────────────────────────
  {
    name: 'registry-drift',
    description: 'Generated files match the canonical registry source',
    required: true,
    artifact: '.evidence/drift-report.txt',
    run: async (): Promise<GateResult> => {
      const syncScript = join(ROOT, 'scripts', 'validate-registry-sync.ts');

      if (!existsSync(syncScript)) {
        const artifact = writeEvidence('drift-report.txt', 'validate-registry-sync.ts not found — skipped');
        return { pass: true, message: 'Registry sync validator not found (skipped)', artifact };
      }

      const nodePath = join(APP_DIR, 'node_modules');
      const { exitCode, stdout, stderr } = runCommand(
        `NODE_PATH=${nodePath} npx tsx ${syncScript}`,
        APP_DIR,
      );

      const report = `$ tsx scripts/validate-registry-sync.ts\n\n${stdout}\n${stderr}`.trim();
      const artifact = writeEvidence('drift-report.txt', report);

      if (exitCode !== 0) {
        const details = (stdout + '\n' + stderr)
          .split('\n')
          .filter(l => l.includes('STALE') || l.includes('MISSING') || l.includes('Fix:'))
          .map(l => l.trim());

        return {
          pass: false,
          message: 'Registry-derived files are out of sync with the canonical source',
          artifact,
          details: [
            ...details.slice(0, 10),
            'Fix: run `tsx scripts/generate-from-registry.ts`',
          ],
        };
      }

      return { pass: true, message: 'All derived files match the registry', artifact };
    },
  },

  // ─── e. Smoke Test ─────────────────────────────────────────────────
  {
    name: 'smoke-test',
    description: 'Run real smoke tests when the app defines them, otherwise validate smoke test files',
    required: true,
    artifact: '.evidence/smoke-validation.log',
    run: async (): Promise<GateResult> => {
      const scripts = readPackageScripts(APP_DIR);
      if (scripts['test:smoke']) {
        const { exitCode, stdout, stderr } = runCommand('pnpm test:smoke', APP_DIR);
        const log = `$ pnpm test:smoke\n\n${stdout}\n${stderr}`.trim();
        const artifact = writeEvidence('smoke-validation.log', log);

        if (exitCode !== 0) {
          return {
            pass: false,
            message: `Smoke tests failed (exit ${exitCode})`,
            artifact,
            details: (stdout + '\n' + stderr)
              .split('\n')
              .filter(Boolean)
              .slice(-12),
          };
        }

        return {
          pass: true,
          message: 'Smoke tests passed',
          artifact,
        };
      }

      // Fallback: validate smoke files exist and look plausible.
      const smokeFiles = walkFiles(APP_DIR, name =>
        name.startsWith('smoke') && (name.endsWith('.spec.ts') || name.endsWith('.test.ts'))
      );

      // Also check in tests/e2e at root
      const rootE2eSmoke = walkFiles(join(ROOT, 'testing'), name =>
        name.startsWith('smoke') && (name.endsWith('.spec.ts') || name.endsWith('.test.ts'))
      );

      const allSmoke = [...smokeFiles, ...rootE2eSmoke];

      if (allSmoke.length === 0) {
        const artifact = writeEvidence('smoke-validation.log', 'No smoke test files found.');
        return {
          pass: false,
          message: 'No smoke test file found',
          artifact,
          details: [
            'Expected: a file named smoke*.spec.ts or smoke*.test.ts in the target app tests/ or root testing/',
            'Create one with basic page-load and API-health assertions.',
          ],
        };
      }

      // Validate each smoke file: check it can be parsed and has test/describe/it blocks
      const validationLines: string[] = [];
      const issues: string[] = [];

      for (const file of allSmoke) {
        const content = readFileSync(file, 'utf-8');
        const relPath = file.replace(ROOT + '/', '');

        const hasTestBlock = /\b(describe|it|test)\s*\(/.test(content);
        const hasExpect = /\b(expect|toHaveScreenshot|toBeOK|toBeTruthy)\b/.test(content);
        const hasImport = /\b(import|require)\b/.test(content);

        validationLines.push(`File: ${relPath}`);
        validationLines.push(`  Has test blocks: ${hasTestBlock}`);
        validationLines.push(`  Has assertions: ${hasExpect}`);
        validationLines.push(`  Has imports: ${hasImport}`);
        validationLines.push('');

        if (!hasTestBlock) {
          issues.push(`${relPath}: no describe/it/test blocks found`);
        }
        if (!hasExpect) {
          issues.push(`${relPath}: no expect/assertion calls found`);
        }
      }

      const artifact = writeEvidence('smoke-validation.log', validationLines.join('\n'));

      if (issues.length > 0) {
        return {
          pass: false,
          message: `Smoke test file(s) found but ${issues.length} issue(s) detected`,
          artifact,
          details: issues,
        };
      }

      return {
        pass: true,
        message: `${allSmoke.length} smoke test file(s) validated`,
        artifact,
      };
    },
  },

  // ─── f. Telemetry Presence ─────────────────────────────────────────
  {
    name: 'telemetry-presence',
    description: 'Every streamText/generateText call has telemetry wired',
    required: true,
    artifact: '.evidence/telemetry-scan.txt',
    run: async (): Promise<GateResult> => {
      const apiDir = join(APP_DIR, 'app', 'api');
      const libDir = join(APP_DIR, 'lib', 'ai');

      const tsFiles = [
        ...walkFiles(apiDir, n => n.endsWith('.ts') || n.endsWith('.tsx')),
        ...walkFiles(libDir, n => n.endsWith('.ts') || n.endsWith('.tsx')),
      ];

      const violations: { file: string; line: number; call: string }[] = [];
      const scannedFiles: string[] = [];

      for (const file of tsFiles) {
        const content = readFileSync(file, 'utf-8');
        const lines = content.split('\n');
        const relPath = file.replace(ROOT + '/', '');

        // Check if file has any AI calls at all
        const hasAICall = content.includes('streamText(') || content.includes('generateText(');
        if (!hasAICall) continue;

        scannedFiles.push(relPath);

        // Check if the file has telemetry somewhere
        const hasTelemetry =
          content.includes('experimental_telemetry') ||
          content.includes('telemetryConfig') ||
          content.includes('withTelemetry');

        if (!hasTelemetry) {
          // Find the exact lines with AI calls
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.includes('streamText(')) {
              violations.push({ file: relPath, line: i + 1, call: 'streamText' });
            }
            if (line.includes('generateText(')) {
              violations.push({ file: relPath, line: i + 1, call: 'generateText' });
            }
          }
        }
      }

      const reportLines = [
        'Telemetry Scan Report',
        '=====================',
        '',
        `Scanned: ${tsFiles.length} TypeScript file(s)`,
        `Files with AI calls: ${scannedFiles.length}`,
        `Violations: ${violations.length}`,
        '',
        '--- Files with AI calls ---',
        ...scannedFiles.map(f => `  ${f}`),
        '',
      ];

      if (violations.length > 0) {
        reportLines.push('--- Violations ---');
        for (const v of violations) {
          reportLines.push(`  ${v.file}:${v.line} — ${v.call}() missing telemetry`);
        }
      }

      const artifact = writeEvidence('telemetry-scan.txt', reportLines.join('\n'));

      if (violations.length > 0) {
        return {
          pass: false,
          message: `${violations.length} AI call(s) missing telemetry`,
          artifact,
          details: violations.map(v => `${v.file}:${v.line} — ${v.call}() has no experimental_telemetry or withTelemetry`),
        };
      }

      return {
        pass: true,
        message: `All ${scannedFiles.length} file(s) with AI calls have telemetry`,
        artifact,
      };
    },
  },

  // ─── g. Docs Freshness ─────────────────────────────────────────────
  {
    name: 'docs-freshness',
    description: 'Docs manifest exists and content hashes match',
    required: false,
    artifact: '.evidence/docs-freshness.txt',
    run: async (): Promise<GateResult> => {
      const manifestPath = join(ROOT, 'docs', 'manifest.json');

      if (!existsSync(manifestPath)) {
        const artifact = writeEvidence('docs-freshness.txt',
          'docs/manifest.json not found.\nRun: tsx scripts/docs-generate-manifest.ts'
        );
        return {
          pass: false,
          message: 'docs/manifest.json missing',
          artifact,
          details: ['Run `tsx scripts/docs-generate-manifest.ts` to create it'],
        };
      }

      let manifest: { version: number; docs: Array<{ id: string; localPath: string; contentHash: string; priority: string }> };
      try {
        manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));
      } catch {
        const artifact = writeEvidence('docs-freshness.txt', 'docs/manifest.json is not valid JSON');
        return { pass: false, message: 'docs/manifest.json is not valid JSON', artifact };
      }

      if (!manifest.docs || manifest.docs.length === 0) {
        const artifact = writeEvidence('docs-freshness.txt', 'docs/manifest.json has 0 entries');
        return { pass: false, message: 'docs/manifest.json has no entries', artifact };
      }

      const { createHash } = await import('crypto');
      const missing: string[] = [];
      const stale: string[] = [];
      const ok: string[] = [];

      for (const doc of manifest.docs) {
        const filePath = join(ROOT, doc.localPath);
        if (!existsSync(filePath)) {
          missing.push(`${doc.id} (${doc.localPath})`);
          continue;
        }

        const content = readFileSync(filePath, 'utf-8');
        const hash = createHash('sha256').update(content, 'utf-8').digest('hex');
        if (hash !== doc.contentHash) {
          stale.push(`${doc.id} (${doc.localPath})`);
        } else {
          ok.push(doc.id);
        }
      }

      const reportLines = [
        'Docs Freshness Report',
        '=====================',
        '',
        `Manifest entries: ${manifest.docs.length}`,
        `In sync: ${ok.length}`,
        `Stale: ${stale.length}`,
        `Missing: ${missing.length}`,
        '',
      ];

      if (stale.length > 0) {
        reportLines.push('--- Stale ---');
        for (const s of stale) reportLines.push(`  ${s}`);
        reportLines.push('');
      }
      if (missing.length > 0) {
        reportLines.push('--- Missing ---');
        for (const m of missing) reportLines.push(`  ${m}`);
        reportLines.push('');
      }

      const artifact = writeEvidence('docs-freshness.txt', reportLines.join('\n'));

      const totalIssues = stale.length + missing.length;
      if (totalIssues > 0) {
        return {
          pass: false,
          message: `${totalIssues} doc(s) out of sync (${stale.length} stale, ${missing.length} missing)`,
          artifact,
          details: [
            ...stale.map(s => `stale: ${s}`),
            ...missing.map(m => `missing: ${m}`),
            'Fix: run `tsx scripts/docs-sync.ts --update` or regenerate manifest',
          ],
        };
      }

      return {
        pass: true,
        message: `All ${manifest.docs.length} doc(s) are current`,
        artifact,
      };
    },
  },

  // ─── h. No @ts-nocheck ────────────────────────────────────────────
  {
    name: 'no-ts-nocheck',
    description: 'No @ts-nocheck in test files',
    required: true,
    run: async (): Promise<GateResult> => {
      const testsDir = join(APP_DIR, 'tests');
      const testFiles = walkFiles(testsDir, n => n.endsWith('.ts') || n.endsWith('.tsx'));

      const violations: string[] = [];

      for (const file of testFiles) {
        const content = readFileSync(file, 'utf-8');
        if (content.includes('@ts-nocheck')) {
          violations.push(file.replace(ROOT + '/', ''));
        }
      }

      const reportLines = [
        '@ts-nocheck Scan',
        '=================',
        '',
        `Test files scanned: ${testFiles.length}`,
        `Violations: ${violations.length}`,
      ];

      if (violations.length > 0) {
        reportLines.push('', '--- Files with @ts-nocheck ---');
        for (const v of violations) reportLines.push(`  ${v}`);
      }

      const artifact = writeEvidence('no-ts-nocheck.txt', reportLines.join('\n'));

      if (violations.length > 0) {
        return {
          pass: false,
          message: `${violations.length} test file(s) use @ts-nocheck`,
          artifact,
          details: violations.slice(0, 10),
        };
      }

      return { pass: true, message: `${testFiles.length} test files clean (no @ts-nocheck)`, artifact };
    },
  },

  // ─── i. Tool Renderer Coverage (recommended) ──────────────────────
  {
    name: 'tool-renderer-coverage',
    description: 'Every custom UI tool has an entry in TOOL_RENDERERS (skip if no renderer map exists)',
    required: false,
    run: async (): Promise<GateResult> => {
      // Look for a TOOL_RENDERERS map anywhere in the project
      const toolMetaPath = join(APP_DIR, 'lib', 'ai', 'tool-meta.ts');
      const renderersFiles = walkFiles(
        join(APP_DIR, 'components'),
        n => n.endsWith('.tsx') || n.endsWith('.ts'),
      ).filter(f => {
        const content = readFileSync(f, 'utf-8');
        return content.includes('TOOL_RENDERERS');
      });

      if (!existsSync(toolMetaPath) || renderersFiles.length === 0) {
        const artifact = writeEvidence(
          'tool-renderer-coverage.txt',
          'TOOL_RENDERERS or tool-meta.ts not found — skipped',
        );
        return { pass: true, message: 'No TOOL_RENDERERS found (skipped)', artifact };
      }

      const toolMetaContent = readFileSync(toolMetaPath, 'utf-8');
      const renderersContent = renderersFiles.map(f => readFileSync(f, 'utf-8')).join('\n');

      const customTools: string[] = [];
      const toolBlockRegex = /^\s+(\w+):\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gm;
      let blockMatch;
      while ((blockMatch = toolBlockRegex.exec(toolMetaContent)) !== null) {
        const name = blockMatch[1];
        const body = blockMatch[2];
        if (body.includes("ui: 'custom'") || body.includes('ui: "custom"')) {
          customTools.push(name);
        }
      }

      const missingRenderers: string[] = [];
      for (const name of customTools) {
        if (!renderersContent.includes(name)) {
          missingRenderers.push(name);
        }
      }

      const reportLines = [
        'Tool Renderer Coverage',
        '======================',
        '',
        `Custom UI tools: ${customTools.length}`,
        `With renderers: ${customTools.length - missingRenderers.length}`,
        `Missing renderers: ${missingRenderers.length}`,
      ];

      if (missingRenderers.length > 0) {
        reportLines.push('', '--- Missing ---');
        for (const n of missingRenderers) reportLines.push(`  ${n}`);
      }

      const artifact = writeEvidence('tool-renderer-coverage.txt', reportLines.join('\n'));

      if (missingRenderers.length > 0) {
        return {
          pass: false,
          message: `${missingRenderers.length} custom tool(s) missing renderers`,
          artifact,
          details: missingRenderers.map(n => `${n}: ui='custom' but not in TOOL_RENDERERS`),
        };
      }

      return { pass: true, message: `All ${customTools.length} custom tools have renderers`, artifact };
    },
  },

  // ─── j. Smoke Test Exists (recommended) ───────────────────────────
  {
    name: 'smoke-test-exists',
    description: 'tests/e2e/smoke.spec.ts exists',
    required: false,
    run: async (): Promise<GateResult> => {
      const smokePath = join(APP_DIR, 'tests', 'e2e', 'smoke.spec.ts');
      const exists = existsSync(smokePath);

      const artifact = writeEvidence(
        'smoke-test-exists.txt',
        exists ? 'Found: tests/e2e/smoke.spec.ts' : 'Not found: tests/e2e/smoke.spec.ts',
      );

      if (!exists) {
        return {
          pass: false,
          message: 'tests/e2e/smoke.spec.ts not found',
          artifact,
          details: ['Create a smoke test with basic page-load and API-health assertions'],
        };
      }

      return { pass: true, message: 'Smoke test file exists', artifact };
    },
  },

  // ─── k. Visual Test Exists (recommended) ──────────────────────────
  {
    name: 'visual-test-exists',
    description: 'tests/e2e/visual-regression.spec.ts exists',
    required: false,
    run: async (): Promise<GateResult> => {
      const visualPath = join(APP_DIR, 'tests', 'e2e', 'visual-regression.spec.ts');
      const exists = existsSync(visualPath);

      const artifact = writeEvidence(
        'visual-test-exists.txt',
        exists ? 'Found: tests/e2e/visual-regression.spec.ts' : 'Not found: tests/e2e/visual-regression.spec.ts',
      );

      if (!exists) {
        return {
          pass: false,
          message: 'tests/e2e/visual-regression.spec.ts not found',
          artifact,
          details: ['Create a visual regression test for key UI states'],
        };
      }

      return { pass: true, message: 'Visual regression test file exists', artifact };
    },
  },

  // ─── l. Storybook Builds (recommended) ────────────────────────────
  {
    name: 'storybook-builds',
    description: '.storybook/ directory exists',
    required: false,
    run: async (): Promise<GateResult> => {
      const storybookDir = join(APP_DIR, '.storybook');
      const exists = existsSync(storybookDir);

      const artifact = writeEvidence(
        'storybook-builds.txt',
        exists ? 'Found: .storybook/ directory' : 'Not found: .storybook/ directory',
      );

      if (!exists) {
        return {
          pass: false,
          message: '.storybook/ directory not found',
          artifact,
          details: ['Add a .storybook/ configuration directory to the project'],
        };
      }

      return { pass: true, message: 'Storybook directory exists', artifact };
    },
  },

  // ─── m. Rubric Coverage (recommended) ─────────────────────────────
  {
    name: 'rubric-coverage',
    description: 'If a tool rubrics file exists, check coverage is above 80% (skip if no rubric system)',
    required: false,
    run: async (): Promise<GateResult> => {
      const toolMetaPath = join(APP_DIR, 'lib', 'ai', 'tool-meta.ts');
      const rubricsPath = join(APP_DIR, 'lib', 'ai', 'tool-rubrics.generated.ts');

      if (!existsSync(rubricsPath)) {
        const artifact = writeEvidence(
          'rubric-coverage.txt',
          'lib/ai/tool-rubrics.generated.ts not found — skipped (no rubric system)',
        );
        return { pass: true, message: 'No rubric system found (skipped)', artifact };
      }

      if (!existsSync(toolMetaPath)) {
        const artifact = writeEvidence('rubric-coverage.txt', 'lib/ai/tool-meta.ts not found');
        return { pass: false, message: 'tool-meta.ts not found', artifact };
      }

      const toolMetaContent = readFileSync(toolMetaPath, 'utf-8');
      const rubricsContent = readFileSync(rubricsPath, 'utf-8');

      const toolNameRegex = /^\s+(\w+):\s*\{/gm;
      const reservedKeys = new Set([
        'label', 'description', 'type', 'ui', 'category', 'dataSources',
        'slashVisible', 'agents', 'plannable', 'disabled', 'qualityRubric',
        'name', 'weight', 'threshold', 'method', 'criteria',
      ]);
      const toolNames: string[] = [];
      let match;
      while ((match = toolNameRegex.exec(toolMetaContent)) !== null) {
        const name = match[1];
        if (!reservedKeys.has(name)) toolNames.push(name);
      }

      const missing: string[] = [];
      for (const name of toolNames) {
        const pattern = new RegExp(`"${name}"\\s*:`);
        if (!pattern.test(rubricsContent)) {
          missing.push(name);
        }
      }

      const total = toolNames.length;
      const covered = total - missing.length;
      const coverage = total > 0 ? covered / total : 0;

      const reportLines = [
        'Rubric Coverage Report',
        '======================',
        '',
        `Tools in TOOL_META:  ${total}`,
        `With rubric:         ${covered}`,
        `Missing rubric:      ${missing.length}`,
        `Coverage:            ${(coverage * 100).toFixed(1)}%`,
      ];

      if (missing.length > 0) {
        reportLines.push('', '--- Missing ---');
        for (const n of missing) reportLines.push(`  ${n}`);
      }

      const artifact = writeEvidence('rubric-coverage.txt', reportLines.join('\n'));

      if (coverage < 0.8) {
        return {
          pass: false,
          message: `Only ${(coverage * 100).toFixed(1)}% of tools have rubrics (target: 80%)`,
          artifact,
          details: missing.slice(0, 15).map(n => `${n}: missing from TOOL_RUBRICS`),
        };
      }

      return {
        pass: true,
        message: `${covered}/${total} tools have rubrics (${(coverage * 100).toFixed(1)}%)`,
        artifact,
      };
    },
  },

  // ─── n. No Drift Detected (recommended) ───────────────────────────
  {
    name: 'no-drift-detected',
    description: 'Latest drift report (.evidence/drift-reports/latest.json) has no errors (skip if missing)',
    required: false,
    run: async (): Promise<GateResult> => {
      const latestPath = join(APP_DIR, '.evidence', 'drift-reports', 'latest.json');

      if (!existsSync(latestPath)) {
        const artifact = writeEvidence(
          'no-drift-detected.txt',
          'No drift report yet — run `pnpm detect:drift` to generate one',
        );
        return { pass: true, message: 'No drift report yet (skipped)', artifact };
      }

      let report: {
        timestamp: string;
        hits: Array<{ rule: string; severity: 'error' | 'warning'; file: string; line: number; message: string }>;
      };

      try {
        report = JSON.parse(readFileSync(latestPath, 'utf-8'));
      } catch {
        const artifact = writeEvidence(
          'no-drift-detected.txt',
          '.evidence/drift-reports/latest.json is not valid JSON',
        );
        return { pass: false, message: 'latest.json is not valid JSON', artifact };
      }

      const errors = report.hits.filter(h => h.severity === 'error');
      const warnings = report.hits.filter(h => h.severity === 'warning');

      const reportLines = [
        'No Drift Detected',
        '=================',
        '',
        `Report timestamp: ${report.timestamp}`,
        `Total hits: ${report.hits.length}`,
        `  errors:   ${errors.length}`,
        `  warnings: ${warnings.length}`,
      ];

      if (report.hits.length > 0) {
        reportLines.push('', '--- Hits ---');
        for (const h of report.hits.slice(0, 30)) {
          reportLines.push(`  [${h.severity}] ${h.file}:${h.line}  ${h.rule} — ${h.message}`);
        }
        if (report.hits.length > 30) {
          reportLines.push(`  ... and ${report.hits.length - 30} more`);
        }
      }

      const artifact = writeEvidence('no-drift-detected.txt', reportLines.join('\n'));

      if (errors.length > 0) {
        return {
          pass: false,
          message: `${errors.length} drift error(s) in committed code`,
          artifact,
          details: errors.slice(0, 10).map(e => `${e.file}:${e.line} — ${e.rule}: ${e.message}`),
        };
      }

      return {
        pass: true,
        message: warnings.length > 0 ? `No drift errors (${warnings.length} warning(s))` : 'No drift detected',
        artifact,
      };
    },
  },

  // ─── o. Research Freshness (recommended) ──────────────────────────
  {
    name: 'research-freshness',
    description: 'If .claude/research/index.json exists, verify entries are not stale (skip if missing)',
    required: false,
    run: async (): Promise<GateResult> => {
      const indexPath = join(APP_DIR, '.claude', 'research', 'index.json');

      if (!existsSync(indexPath)) {
        const artifact = writeEvidence(
          'research-freshness.txt',
          '.claude/research/index.json not found — skipped (no research cache)',
        );
        return { pass: true, message: 'No research index found (skipped)', artifact };
      }

      interface CacheEntry {
        id: string;
        lastFetched: string;
        validUntil: string;
        triggerPaths: string[];
      }
      interface CacheIndex {
        version: number;
        generated: string;
        entries: CacheEntry[];
      }

      let index: CacheIndex;
      try {
        index = JSON.parse(readFileSync(indexPath, 'utf-8')) as CacheIndex;
      } catch (err) {
        const artifact = writeEvidence(
          'research-freshness.txt',
          `index.json is not valid JSON: ${err instanceof Error ? err.message : String(err)}`,
        );
        return { pass: false, message: 'index.json invalid', artifact };
      }

      const { exitCode: gitCode, stdout: gitOut } = runCommand('git diff --name-only HEAD', APP_DIR);
      const changed = gitCode === 0
        ? gitOut.split('\n').map(l => l.trim()).filter(Boolean)
        : [];

      const globPrefix = (pattern: string): string => {
        const star = pattern.indexOf('*');
        return star === -1 ? pattern : pattern.slice(0, star);
      };

      const triggered = new Set<string>();
      for (const file of changed) {
        for (const entry of index.entries) {
          for (const pattern of entry.triggerPaths) {
            const prefix = globPrefix(pattern);
            if (prefix === '' || file === pattern || file.startsWith(prefix)) {
              triggered.add(entry.id);
              break;
            }
          }
        }
      }

      const now = Date.now();
      const DAY_MS = 24 * 60 * 60 * 1000;
      const stale: string[] = [];

      const idsToCheck = triggered.size > 0 ? [...triggered] : index.entries.map(e => e.id);
      for (const id of idsToCheck) {
        const entry = index.entries.find(e => e.id === id);
        if (!entry) continue;
        const fetched = new Date(entry.lastFetched).getTime();
        const validUntil = new Date(entry.validUntil).getTime();
        const ageDays = Number.isFinite(fetched) && fetched > 0
          ? Math.floor((now - fetched) / DAY_MS)
          : Infinity;
        if (ageDays > 7 || !Number.isFinite(validUntil) || validUntil < now) {
          stale.push(`${id} (age: ${Number.isFinite(ageDays) ? ageDays + 'd' : 'never'})`);
        }
      }

      const reportLines = [
        'Research Freshness Report',
        '=========================',
        '',
        `Index entries:   ${index.entries.length}`,
        `Changed files:   ${changed.length}`,
        `Triggered:       ${triggered.size}`,
        `Checked:         ${idsToCheck.length}`,
        `Stale:           ${stale.length}`,
        '',
      ];

      if (triggered.size > 0) {
        reportLines.push('--- Triggered by diff ---');
        for (const id of triggered) reportLines.push(`  ${id}`);
        reportLines.push('');
      }

      if (stale.length > 0) {
        reportLines.push('--- Stale ---');
        for (const s of stale) reportLines.push(`  ${s}`);
        reportLines.push('');
        reportLines.push('Fix: pnpm research:refresh <id>');
      }

      const artifact = writeEvidence('research-freshness.txt', reportLines.join('\n'));

      if (stale.length > 0) {
        return {
          pass: false,
          message: `${stale.length} research entry(ies) stale`,
          artifact,
          details: stale.map(s => `stale: ${s} — run \`pnpm research:refresh ${s.split(' ')[0]}\``),
        };
      }

      return {
        pass: true,
        message: triggered.size > 0
          ? `${idsToCheck.length} triggered entry(ies) fresh`
          : `All ${index.entries.length} research entry(ies) fresh`,
        artifact,
      };
    },
  },

  // ─── p. Evidence Bundle ────────────────────────────────────────────
  // This gate runs last and collects all prior artifacts into a summary.
  // It is registered separately and handled in the runner below.
];

// ── Runner ────────────────────────────────────────────────────────────

async function run() {
  ensureEvidenceDir();

  console.log('\n  Gate Runner \u2014 Vercel AI Starter Kit\n');
  console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\n');

  const summaries: GateSummary[] = [];
  let passed = 0;
  let failed = 0;
  let warned = 0;

  for (const gate of gates) {
    const start = Date.now();
    let result: GateResult;

    try {
      result = await gate.run();
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      result = {
        pass: false,
        message: `Gate threw: ${message}`,
        details: [err instanceof Error ? err.stack ?? '' : ''],
      };
    }

    const durationMs = Date.now() - start;
    const durationStr = (durationMs / 1000).toFixed(1);

    const icon = result.pass
      ? '\x1b[32m\u2713\x1b[0m'
      : gate.required
        ? '\x1b[31m\u2717\x1b[0m'
        : '\x1b[33m\u26a0\x1b[0m';
    const artifactStr = result.artifact ? ` \u2192 ${result.artifact}` : '';
    const reqTag = gate.required ? '' : ' \x1b[2m(recommended)\x1b[0m';

    console.log(`  ${icon} ${gate.name}${reqTag} (${durationStr}s)${artifactStr}`);

    if (!result.pass) {
      console.log(`      ${result.message}`);
      if (result.details) {
        for (const d of result.details.slice(0, 8)) {
          console.log(`        ${d}`);
        }
        if (result.details.length > 8) {
          console.log(`        ... and ${result.details.length - 8} more`);
        }
      }
      if (gate.required) {
        failed++;
      } else {
        warned++;
      }
    } else {
      passed++;
    }

    summaries.push({
      gate: gate.name,
      required: gate.required,
      pass: result.pass,
      message: result.message,
      artifact: result.artifact ?? null,
      durationMs,
      details: result.details ?? [],
    });
  }

  // ── Evidence Bundle (final gate) ─────────────────────────────────

  const bundleSummary = {
    timestamp: new Date().toISOString(),
    totalGates: gates.length,
    passed,
    failed,
    warned,
    gates: summaries,
  };

  const bundlePath = writeEvidence('summary.json', JSON.stringify(bundleSummary, null, 2));

  console.log('');
  console.log('  \u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500');
  console.log(`  ${passed}/${gates.length} gates passed. Evidence bundle: ${bundlePath}`);
  if (warned > 0) {
    console.log(`  \x1b[33m${warned} recommended gate(s) did not pass (warnings only).\x1b[0m`);
  }
  console.log('');

  if (failed > 0) {
    console.log('  \x1b[31mGate check FAILED.\x1b[0m Fix required gate failures above before proceeding.\n');
    process.exit(1);
  } else {
    console.log('  \x1b[32mAll required gates passed.\x1b[0m\n');
    process.exit(0);
  }
}

run().catch(err => {
  console.error('Gate runner crashed:', err);
  process.exit(1);
});
