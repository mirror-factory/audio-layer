#!/usr/bin/env tsx

import { execSync } from 'child_process';
import { createHash } from 'crypto';
import { inflateSync } from 'zlib';
import { existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from 'fs';
import { dirname, resolve } from 'path';
import {
  BROWSER_PROOF_MANIFEST_FILE,
  COMPANION_MANIFEST_FILE,
  LATEST_ITERATION_FILE,
  RUNS_DIR,
  formatSyncSummary,
  generateCompanionSkeletons,
  generateScorecard,
  syncStarterSystem,
  type CompanionTask,
  type Scorecard,
} from './ai-starter-core.js';

interface IterationCommand {
  command: string;
  required: boolean;
  skipped?: boolean;
  skipReason?: string;
}

interface IterationCommandResult {
  command: string;
  required: boolean;
  skipped: boolean;
  ok: boolean;
  exitCode: number;
  durationMs: number;
  output: string;
}

interface IterationProofRun {
  id: string;
  createdAt: string;
  status: 'completed' | 'blocked' | 'plateau' | 'regression';
  stopReason: string;
  targetScore: number;
  scoreAtStart: number;
  scoreAtEnd: number;
  blockerCountAtStart: number;
  blockerCountAtEnd: number;
  evidenceAtStart: number;
  evidenceAtEnd: number;
  browserProofAtStart: Scorecard['summary']['browserProof'];
  browserProofAtEnd: Scorecard['summary']['browserProof'];
  visualComparison: IterationVisualComparison;
  commands: IterationCommandResult[];
  selectedImprovement: IterationImprovement;
  mutation: IterationMutation;
  recommendedActions: string[];
}

interface IterationImprovement {
  id: string;
  title: string;
  target: string;
  mode: 'planned' | 'applied' | 'skipped';
  reason: string;
  files: string[];
  verificationCommands: string[];
}

interface IterationMutation {
  attempted: boolean;
  applied: boolean;
  policy: 'safe-scaffold-only';
  reason: string;
  changedFiles: string[];
  skippedFiles: string[];
  consideredTasks: string[];
}

interface ScreenshotSnapshotEntry {
  path: string;
  exists: boolean;
  bytes: number;
  mtimeMs: number;
  sha256: string | null;
  width: number | null;
  height: number | null;
  pixelHash: string | null;
  decodeError: string | null;
}

interface InternalScreenshotSnapshotEntry extends ScreenshotSnapshotEntry {
  pixelData?: {
    bytesPerPixel: number;
    raw: Buffer;
  };
}

interface ScreenshotDiffEntry {
  path: string;
  status: 'added' | 'removed' | 'unchanged' | 'changed';
  before: ScreenshotSnapshotEntry | null;
  after: ScreenshotSnapshotEntry | null;
  byteDelta: number;
  pixelDiffRatio: number | null;
  reason: string;
}

interface IterationVisualComparison {
  createdAt: string;
  beforeCount: number;
  afterCount: number;
  compared: number;
  added: number;
  removed: number;
  changed: number;
  unchanged: number;
  maxPixelDiffRatio: number | null;
  files: ScreenshotDiffEntry[];
}

const cwd = process.cwd();

function nowIso(): string {
  return new Date().toISOString();
}

function writeJson(relPath: string, value: unknown): void {
  const full = resolve(cwd, relPath);
  mkdirSync(dirname(full), { recursive: true });
  writeFileSync(full, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function readJson<T>(relPath: string, fallback: T): T {
  try {
    const full = resolve(cwd, relPath);
    return existsSync(full) ? JSON.parse(readFileSync(full, 'utf-8')) as T : fallback;
  } catch {
    return fallback;
  }
}

function sha256(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

function collectFiles(root: string): string[] {
  const fullRoot = resolve(cwd, root);
  if (!existsSync(fullRoot)) return [];
  const results: string[] = [];
  const walk = (dir: string) => {
    for (const item of readdirSync(dir, { withFileTypes: true })) {
      const full = resolve(dir, item.name);
      if (item.isDirectory()) {
        walk(full);
        continue;
      }
      if (/\.(png|jpg|jpeg)$/i.test(item.name)) {
        results.push(full.replace(`${cwd}/`, ''));
      }
    }
  };
  walk(fullRoot);
  return results.sort();
}

function collectScreenshotPaths(): string[] {
  const manifest = readJson<{ screenshotPaths?: string[] }>(BROWSER_PROOF_MANIFEST_FILE, {});
  const paths = [
    ...(manifest.screenshotPaths ?? []).filter(
      (path) => path.startsWith('.evidence/screenshots/') || path.startsWith('.evidence/smoke/'),
    ),
    ...collectFiles('.evidence/screenshots'),
    ...collectFiles('.evidence/smoke'),
  ];
  return Array.from(new Set(paths)).sort();
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  if (pb <= pc) return b;
  return c;
}

function decodePng(buffer: Buffer): {
  width: number;
  height: number;
  bytesPerPixel: number;
  raw: Buffer;
} {
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') throw new Error('not-png');

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  let interlace = 0;
  const idat: Buffer[] = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.subarray(offset + 4, offset + 8).toString('ascii');
    const data = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 'IHDR') {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data.readUInt8(8);
      colorType = data.readUInt8(9);
      interlace = data.readUInt8(12);
    }
    if (type === 'IDAT') idat.push(data);
    if (type === 'IEND') break;
    offset += length + 12;
  }

  if (bitDepth !== 8) throw new Error(`unsupported-bit-depth:${bitDepth}`);
  if (interlace !== 0) throw new Error('unsupported-interlace');
  const channels = colorType === 6 ? 4 : colorType === 2 ? 3 : colorType === 4 ? 2 : colorType === 0 ? 1 : 0;
  if (channels === 0) throw new Error(`unsupported-color-type:${colorType}`);
  if (width <= 0 || height <= 0) throw new Error('missing-ihdr');

  const inflated = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  const raw = Buffer.alloc(stride * height);
  let sourceOffset = 0;
  let targetOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = inflated[sourceOffset];
    sourceOffset += 1;
    for (let x = 0; x < stride; x += 1) {
      const value = inflated[sourceOffset + x] ?? 0;
      const left = x >= channels ? raw[targetOffset + x - channels] ?? 0 : 0;
      const up = y > 0 ? raw[targetOffset + x - stride] ?? 0 : 0;
      const upLeft = y > 0 && x >= channels ? raw[targetOffset + x - stride - channels] ?? 0 : 0;
      if (filter === 0) raw[targetOffset + x] = value;
      else if (filter === 1) raw[targetOffset + x] = (value + left) & 0xff;
      else if (filter === 2) raw[targetOffset + x] = (value + up) & 0xff;
      else if (filter === 3) raw[targetOffset + x] = (value + Math.floor((left + up) / 2)) & 0xff;
      else if (filter === 4) raw[targetOffset + x] = (value + paeth(left, up, upLeft)) & 0xff;
      else throw new Error(`unsupported-filter:${filter}`);
    }
    sourceOffset += stride;
    targetOffset += stride;
  }

  return { width, height, bytesPerPixel: channels, raw };
}

function screenshotSnapshot(path: string): InternalScreenshotSnapshotEntry {
  const full = resolve(cwd, path);
  if (!existsSync(full)) {
    return {
      path,
      exists: false,
      bytes: 0,
      mtimeMs: 0,
      sha256: null,
      width: null,
      height: null,
      pixelHash: null,
      decodeError: 'missing',
    };
  }
  const buffer = readFileSync(full);
  const stat = statSync(full);
  let width: number | null = null;
  let height: number | null = null;
  let pixelHash: string | null = null;
  let decodeError: string | null = null;
  let pixelData: InternalScreenshotSnapshotEntry['pixelData'];
  if (path.toLowerCase().endsWith('.png')) {
    try {
      const decoded = decodePng(buffer);
      width = decoded.width;
      height = decoded.height;
      pixelHash = sha256(decoded.raw);
      pixelData = {
        bytesPerPixel: decoded.bytesPerPixel,
        raw: decoded.raw,
      };
    } catch (error) {
      decodeError = error instanceof Error ? error.message : String(error);
    }
  }
  return {
    path,
    exists: true,
    bytes: buffer.length,
    mtimeMs: stat.mtimeMs,
    sha256: sha256(buffer),
    width,
    height,
    pixelHash,
    decodeError,
    pixelData,
  };
}

function snapshotScreenshots(): InternalScreenshotSnapshotEntry[] {
  return collectScreenshotPaths().map(screenshotSnapshot);
}

function publicSnapshot(entry: InternalScreenshotSnapshotEntry | null): ScreenshotSnapshotEntry | null {
  if (!entry) return null;
  const { pixelData: _pixelData, ...publicEntry } = entry;
  void _pixelData;
  return publicEntry;
}

function pixelDiffRatio(
  before: InternalScreenshotSnapshotEntry,
  after: InternalScreenshotSnapshotEntry,
): number | null {
  if (!before.exists || !after.exists) return null;
  if (before.width !== after.width || before.height !== after.height) return null;
  if (!before.pixelData || !after.pixelData) return null;
  if (before.pixelData.bytesPerPixel !== after.pixelData.bytesPerPixel) return null;
  if (before.pixelData.raw.length !== after.pixelData.raw.length) return null;
  let changedPixels = 0;
  const pixelCount = (before.width ?? 0) * (before.height ?? 0);
  for (let i = 0; i < before.pixelData.raw.length; i += before.pixelData.bytesPerPixel) {
      let changed = false;
      for (let channel = 0; channel < before.pixelData.bytesPerPixel; channel += 1) {
        if (before.pixelData.raw[i + channel] !== after.pixelData.raw[i + channel]) {
          changed = true;
          break;
        }
      }
      if (changed) changedPixels += 1;
  }
  return pixelCount === 0 ? null : changedPixels / pixelCount;
}

function compareScreenshots(
  before: InternalScreenshotSnapshotEntry[],
  after: InternalScreenshotSnapshotEntry[],
): IterationVisualComparison {
  const beforeByPath = new Map(before.map(entry => [entry.path, entry]));
  const afterByPath = new Map(after.map(entry => [entry.path, entry]));
  const paths = Array.from(new Set([...beforeByPath.keys(), ...afterByPath.keys()])).sort();
  const files = paths.map(path => {
    const beforeEntry = beforeByPath.get(path) ?? null;
    const afterEntry = afterByPath.get(path) ?? null;
    if (!beforeEntry && afterEntry) {
      return {
        path,
        status: 'added' as const,
        before: null,
        after: publicSnapshot(afterEntry),
        byteDelta: afterEntry.bytes,
        pixelDiffRatio: null,
        reason: 'new-screenshot',
      };
    }
    if (beforeEntry && !afterEntry) {
      return {
        path,
        status: 'removed' as const,
        before: publicSnapshot(beforeEntry),
        after: null,
        byteDelta: -beforeEntry.bytes,
        pixelDiffRatio: null,
        reason: 'screenshot-removed',
      };
    }
    const safeBefore = beforeEntry!;
    const safeAfter = afterEntry!;
    const changed = safeBefore.sha256 !== safeAfter.sha256;
    const ratio = changed ? pixelDiffRatio(safeBefore, safeAfter) : 0;
    return {
      path,
      status: changed ? 'changed' as const : 'unchanged' as const,
      before: publicSnapshot(safeBefore),
      after: publicSnapshot(safeAfter),
      byteDelta: safeAfter.bytes - safeBefore.bytes,
      pixelDiffRatio: ratio,
      reason: changed ? 'hash-changed' : 'hash-unchanged',
    };
  });
  const changedRatios = files
    .filter(file => file.status === 'changed')
    .map(file => file.pixelDiffRatio)
    .filter((value): value is number => typeof value === 'number');
  return {
    createdAt: nowIso(),
    beforeCount: before.length,
    afterCount: after.length,
    compared: files.filter(file => file.before && file.after).length,
    added: files.filter(file => file.status === 'added').length,
    removed: files.filter(file => file.status === 'removed').length,
    changed: files.filter(file => file.status === 'changed').length,
    unchanged: files.filter(file => file.status === 'unchanged').length,
    maxPixelDiffRatio: changedRatios.length > 0 ? Math.max(...changedRatios) : null,
    files,
  };
}

async function urlReachable(url: string): Promise<boolean> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 3500);
  try {
    const response = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: { 'user-agent': 'ai-starter-iterate/0.1' },
    });
    return response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveBaseUrl(): Promise<string | null> {
  const candidates = [
    process.env.AI_STARTER_BASE_URL,
    process.env.PLAYWRIGHT_BASE_URL,
    'http://localhost:3000',
    'http://localhost:3200',
    'http://localhost:4173',
    'http://localhost:5173',
  ].filter((value): value is string => Boolean(value?.trim()));

  for (const candidate of [...new Set(candidates)]) {
    if (await urlReachable(candidate)) {
      return candidate;
    }
  }

  return null;
}

function commandsFromEnv(): IterationCommand[] | null {
  const raw = process.env.AI_STARTER_ITERATE_COMMANDS;
  if (!raw?.trim()) return null;
  return raw
    .split(/\n|;/)
    .map(command => command.trim())
    .filter(Boolean)
    .map(command => ({ command, required: true }));
}

async function defaultCommands(): Promise<IterationCommand[]> {
  const baseUrl = await resolveBaseUrl();
  const commands: IterationCommand[] = [];
  if (baseUrl) {
    commands.push({
      command: `AI_STARTER_BASE_URL=${baseUrl} PLAYWRIGHT_BASE_URL=${baseUrl} pnpm browser:proof`,
      required: true,
    });
  } else {
    commands.push({
      command: 'pnpm browser:proof',
      required: false,
      skipped: true,
      skipReason: 'No reachable local app URL found; start the dev server or set AI_STARTER_BASE_URL',
    });
  }
  if (process.env.AI_STARTER_ITERATE_SKIP_GATES !== '1') {
    commands.push({ command: 'pnpm gates', required: true });
  }
  commands.push({ command: 'pnpm score', required: true });
  return commands;
}

function runCommand(item: IterationCommand): IterationCommandResult {
  if (item.skipped) {
    return {
      command: item.command,
      required: item.required,
      skipped: true,
      ok: !item.required,
      exitCode: 0,
      durationMs: 0,
      output: item.skipReason ?? 'skipped',
    };
  }

  const startedAt = Date.now();
  try {
    const output = execSync(item.command, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 300_000,
      env: process.env,
    });
    return {
      command: item.command,
      required: item.required,
      skipped: false,
      ok: true,
      exitCode: 0,
      durationMs: Date.now() - startedAt,
      output: output.trim().slice(-12_000),
    };
  } catch (error) {
    const typed = error as { status?: number; stdout?: string; stderr?: string };
    return {
      command: item.command,
      required: item.required,
      skipped: false,
      ok: false,
      exitCode: typed.status ?? 1,
      durationMs: Date.now() - startedAt,
      output: `${typed.stdout ?? ''}\n${typed.stderr ?? ''}`.trim().slice(-12_000),
    };
  }
}

function deriveStatus(
  before: Scorecard,
  after: Scorecard,
  commandResults: IterationCommandResult[],
  targetScore: number,
  mutation: IterationMutation,
): Pick<IterationProofRun, 'status' | 'stopReason'> {
  const failedRequired = commandResults.filter(result => result.required && !result.ok);
  if (failedRequired.length > 0) {
    return { status: 'blocked', stopReason: `verification-failed:${failedRequired.map(result => result.command).join(',')}` };
  }
  if (after.blockers.length > 0) {
    return { status: 'blocked', stopReason: 'scorecard-blockers' };
  }
  if (after.score < before.score) {
    return { status: 'regression', stopReason: `score-regressed:${before.score}->${after.score}` };
  }
  if (after.score >= targetScore) {
    return { status: 'completed', stopReason: `target-score-met:${targetScore}` };
  }
  if (mutation.applied && after.summary.evidence.total > before.summary.evidence.total) {
    return { status: 'completed', stopReason: `safe-mutation-applied:evidence-${before.summary.evidence.total}->${after.summary.evidence.total}` };
  }
  if (after.score === before.score) {
    return { status: 'plateau', stopReason: `score-plateau:${after.score}` };
  }
  return { status: 'completed', stopReason: `score-improved:${before.score}->${after.score}` };
}

function chooseImprovement(scorecard: Scorecard): IterationImprovement {
  const recommendationText = scorecard.recommendations.join(' ').toLowerCase();
  const companions = readJson<{ tasks?: CompanionTask[] }>(COMPANION_MANIFEST_FILE, { tasks: [] }).tasks ?? [];
  const pendingCompanion = companions.find(task => task.status === 'pending');

  if (pendingCompanion) {
    return {
      id: 'satisfy-companion-obligations',
      title: 'Generate one missing companion verification surface',
      target: pendingCompanion.path,
      mode: 'planned',
      reason: `Pending companion task ${pendingCompanion.id} is safe to scaffold before broader autonomous changes.`,
      files: [pendingCompanion.path, ...pendingCompanion.missing],
      verificationCommands: ['pnpm score', 'pnpm gates'],
    };
  }

  if (scorecard.blockers.length > 0) {
    return {
      id: 'resolve-scorecard-blocker',
      title: 'Resolve the first scorecard blocker',
      target: scorecard.blockers[0] ?? 'unknown blocker',
      mode: 'planned',
      reason: 'Scorecard blockers must be resolved before autonomy can safely polish or expand scope.',
      files: ['.ai-starter/runs/latest-scorecard.json'],
      verificationCommands: ['pnpm score', 'pnpm gates'],
    };
  }

  if (scorecard.summary.evidence.traces === 0 && scorecard.summary.evidence.videos === 0) {
    return {
      id: 'capture-trace-or-video-evidence',
      title: 'Capture trace or video evidence for UI work',
      target: 'evidence-depth',
      mode: 'planned',
      reason: 'The scorecard is green, but trace/video evidence is still missing; this is the clearest next proof upgrade.',
      files: ['playwright.config.ts', '.evidence/', 'tests/e2e/'],
      verificationCommands: ['pnpm browser:proof', 'pnpm gates', 'pnpm score'],
    };
  }

  if (scorecard.summary.companions.pending > 0) {
    return {
      id: 'satisfy-companion-obligations',
      title: 'Convert pending companion obligations into real tests or stories',
      target: 'coverage-completeness',
      mode: 'planned',
      reason: 'Pending companion tasks mean a surface exists without its expected verification artifact.',
      files: ['.ai-starter/manifests/companions.json', 'tests/', 'components/'],
      verificationCommands: ['pnpm companions', 'pnpm test', 'pnpm storybook:build', 'pnpm score'],
    };
  }

  if (recommendationText.includes('plan')) {
    return {
      id: 'refresh-active-plan',
      title: 'Refresh the active plan artifact',
      target: 'handoff-accuracy',
      mode: 'planned',
      reason: 'The repo is healthy, but the active plan may not match the current implementation scope.',
      files: ['.ai-starter/plans/latest.json', '.ai-starter/session.json', '.ai-starter/progress.json'],
      verificationCommands: ['pnpm plan', 'pnpm report', 'pnpm score'],
    };
  }

  return {
    id: 'target-met-no-mutation',
    title: 'No safe mutation selected',
    target: 'maintain-current-score',
    mode: 'skipped',
    reason: 'The target score is met and no bounded improvement can be applied without a user-approved scope.',
    files: [],
    verificationCommands: ['pnpm iterate'],
  };
}

function isSafeMutationPath(path: string): boolean {
  return (
    path.startsWith('tests/') ||
    path.startsWith('docs/') ||
    path.startsWith('evals/') ||
    path.startsWith('components/') ||
    path.startsWith('.evidence/rubrics/')
  );
}

function applyImprovement(improvement: IterationImprovement): { improvement: IterationImprovement; mutation: IterationMutation } {
  if (process.env.AI_STARTER_ITERATE_MUTATE === '0') {
    return {
      improvement: { ...improvement, mode: 'skipped', reason: `${improvement.reason} Mutation disabled by AI_STARTER_ITERATE_MUTATE=0.` },
      mutation: {
        attempted: false,
        applied: false,
        policy: 'safe-scaffold-only',
        reason: 'mutation-disabled',
        changedFiles: [],
        skippedFiles: [],
        consideredTasks: [],
      },
    };
  }

  if (improvement.id !== 'satisfy-companion-obligations') {
    return {
      improvement,
      mutation: {
        attempted: false,
        applied: false,
        policy: 'safe-scaffold-only',
        reason: 'no-safe-mutation-for-selected-improvement',
        changedFiles: [],
        skippedFiles: [],
        consideredTasks: [],
      },
    };
  }

  const result = generateCompanionSkeletons(
    { cwd },
    {
      pendingOnly: true,
      limit: 1,
    },
  );
  const unsafeFiles = result.created.filter(file => !isSafeMutationPath(file));
  if (unsafeFiles.length > 0) {
    return {
      improvement: { ...improvement, mode: 'skipped', reason: `${improvement.reason} Unsafe generated path detected: ${unsafeFiles.join(', ')}.` },
      mutation: {
        attempted: true,
        applied: false,
        policy: 'safe-scaffold-only',
        reason: `unsafe-generated-path:${unsafeFiles.join(',')}`,
        changedFiles: [],
        skippedFiles: result.skipped,
        consideredTasks: result.considered,
      },
    };
  }

  return {
    improvement: {
      ...improvement,
      mode: result.created.length > 0 ? 'applied' : 'skipped',
      reason: result.created.length > 0
        ? `${improvement.reason} Generated ${result.created.length} companion scaffold file(s).`
        : `${improvement.reason} No new files were needed for the first pending companion task.`,
      files: result.created.length > 0 ? result.created : improvement.files,
    },
    mutation: {
      attempted: true,
      applied: result.created.length > 0,
      policy: 'safe-scaffold-only',
      reason: result.created.length > 0 ? 'companion-scaffolds-created' : 'no-new-companion-files-created',
      changedFiles: result.created,
      skippedFiles: result.skipped,
      consideredTasks: result.considered,
    },
  };
}

function writeImprovementPlan(run: IterationProofRun): void {
  const lines = [
    `# Iteration Plan: ${run.selectedImprovement.title}`,
    '',
    `- Run: ${run.id}`,
    `- Status: ${run.status}`,
    `- Stop reason: ${run.stopReason}`,
    `- Score: ${run.scoreAtStart} -> ${run.scoreAtEnd}`,
    `- Evidence: ${run.evidenceAtStart} -> ${run.evidenceAtEnd}`,
    `- Improvement mode: ${run.selectedImprovement.mode}`,
    `- Target: ${run.selectedImprovement.target}`,
    `- Mutation attempted: ${run.mutation.attempted}`,
    `- Mutation applied: ${run.mutation.applied}`,
    `- Visual changed files: ${run.visualComparison.changed}`,
    `- Visual max pixel diff: ${run.visualComparison.maxPixelDiffRatio === null ? 'n/a' : run.visualComparison.maxPixelDiffRatio.toFixed(6)}`,
    '',
    '## Reason',
    '',
    run.selectedImprovement.reason,
    '',
    '## Files',
    '',
    ...(run.selectedImprovement.files.length > 0
      ? run.selectedImprovement.files.map(file => `- ${file}`)
      : ['- none']),
    '',
    '## Mutation',
    '',
    `- Policy: ${run.mutation.policy}`,
    `- Reason: ${run.mutation.reason}`,
    `- Considered tasks: ${run.mutation.consideredTasks.length > 0 ? run.mutation.consideredTasks.join(', ') : 'none'}`,
    `- Changed files: ${run.mutation.changedFiles.length > 0 ? run.mutation.changedFiles.join(', ') : 'none'}`,
    `- Skipped files: ${run.mutation.skippedFiles.length > 0 ? run.mutation.skippedFiles.join(', ') : 'none'}`,
    '',
    '## Visual Comparison',
    '',
    `- Screenshots before: ${run.visualComparison.beforeCount}`,
    `- Screenshots after: ${run.visualComparison.afterCount}`,
    `- Compared: ${run.visualComparison.compared}`,
    `- Added: ${run.visualComparison.added}`,
    `- Removed: ${run.visualComparison.removed}`,
    `- Changed: ${run.visualComparison.changed}`,
    `- Unchanged: ${run.visualComparison.unchanged}`,
    `- Max pixel diff ratio: ${run.visualComparison.maxPixelDiffRatio === null ? 'n/a' : run.visualComparison.maxPixelDiffRatio.toFixed(6)}`,
    '',
    '## Verification Commands',
    '',
    ...run.selectedImprovement.verificationCommands.map(command => `- \`${command}\``),
    '',
    '## Commands Run',
    '',
    ...run.commands.map(result => `- ${result.ok ? 'ok' : 'failed'}: \`${result.command}\``),
    '',
  ];
  writeFileSync(resolve(cwd, `${RUNS_DIR}/latest-iteration-plan.md`), lines.join('\n'), 'utf-8');
}

async function main(): Promise<void> {
  const targetScore = Number(process.env.AI_STARTER_ITERATE_TARGET_SCORE ?? '90');
  const sync = syncStarterSystem({ cwd });
  const before = generateScorecard({ cwd });
  const visualBefore = snapshotScreenshots();
  const id = `${new Date().toISOString().replace(/[:.]/g, '-')}-iterate-proof`;

  console.log(`Starter sync complete: ${formatSyncSummary(sync)}`);
  console.log(`Iteration target: ${targetScore}/100`);
  console.log(`Score at start: ${before.score}/100`);
  const selected = chooseImprovement(before);
  const { improvement: selectedImprovement, mutation } = applyImprovement(selected);
  const afterMutation = generateScorecard({ cwd });

  let commandResults: IterationCommandResult[] = [];
  if (afterMutation.blockers.length > 0 && !mutation.applied) {
    commandResults = [];
  } else {
    const commands = commandsFromEnv() ?? await defaultCommands();
    commandResults = commands.map(runCommand);
  }

  const visualAfter = snapshotScreenshots();
  const visualComparison = compareScreenshots(visualBefore, visualAfter);
  writeJson(`${RUNS_DIR}/latest-visual-diff.json`, visualComparison);
  writeJson(`${RUNS_DIR}/${id}-visual-diff.json`, visualComparison);

  syncStarterSystem({ cwd });
  const after = generateScorecard({ cwd });
  const status = afterMutation.blockers.length > 0 && !mutation.applied
    ? { status: 'blocked' as const, stopReason: 'start-scorecard-blockers' }
    : deriveStatus(before, after, commandResults, targetScore, mutation);

  const run: IterationProofRun = {
    id,
    createdAt: nowIso(),
    ...status,
    targetScore,
    scoreAtStart: before.score,
    scoreAtEnd: after.score,
    blockerCountAtStart: before.blockers.length,
    blockerCountAtEnd: after.blockers.length,
    evidenceAtStart: before.summary.evidence.total,
    evidenceAtEnd: after.summary.evidence.total,
    browserProofAtStart: before.summary.browserProof,
    browserProofAtEnd: after.summary.browserProof,
    visualComparison,
    commands: commandResults,
    selectedImprovement,
    mutation,
    recommendedActions: [
      ...after.blockers.map(blocker => `Resolve blocker: ${blocker}`),
      ...after.recommendations.slice(0, 5),
    ],
  };

  writeJson(LATEST_ITERATION_FILE, run);
  writeJson(`${RUNS_DIR}/${id}.json`, run);
  writeImprovementPlan(run);

  const previous = readJson<IterationProofRun | null>(LATEST_ITERATION_FILE, null);
  void previous;

  console.log(`Iteration status: ${run.status}`);
  console.log(`Stop reason: ${run.stopReason}`);
  console.log(`Score at end: ${run.scoreAtEnd}/100`);
  console.log(`Evidence: ${run.evidenceAtStart} -> ${run.evidenceAtEnd}`);
  console.log(`Visual diff: changed=${run.visualComparison.changed} added=${run.visualComparison.added} removed=${run.visualComparison.removed} maxPixelDiff=${run.visualComparison.maxPixelDiffRatio === null ? 'n/a' : run.visualComparison.maxPixelDiffRatio.toFixed(6)}`);
  console.log(`Selected improvement: ${run.selectedImprovement.id} (${run.selectedImprovement.mode})`);
  console.log(`Mutation: attempted=${run.mutation.attempted} applied=${run.mutation.applied} changed=${run.mutation.changedFiles.length}`);
  for (const result of run.commands) {
    const marker = result.skipped ? 'skipped' : result.ok ? 'ok' : 'failed';
    console.log(`Command ${marker}: ${result.command} (${result.durationMs}ms)`);
  }
  console.log(`Record: ${LATEST_ITERATION_FILE}`);

  if ((run.status === 'blocked' || run.status === 'regression') && process.env.AI_STARTER_ITERATE_ALLOW_BLOCKED !== '1') {
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
