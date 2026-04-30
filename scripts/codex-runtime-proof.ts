#!/usr/bin/env tsx

import { execFileSync, spawnSync } from 'child_process';
import { appendFileSync, cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';

interface StaticHookCheck {
  event: string;
  expected: string[];
  found: string[];
  missing: string[];
  pass: boolean;
}

interface CodexRuntimeProofReport {
  generatedAt: string;
  projectRoot: string;
  configPath: string;
  hooksPath: string;
  codexCliFound: boolean;
  codexVersion: string | null;
  configChecks: Array<{ name: string; pass: boolean; detail: string }>;
  staticChecks: StaticHookCheck[];
  behaviorChecks: Array<{ name: string; pass: boolean; detail: string }>;
  runtime: {
    attempted: boolean;
    skippedReason: string | null;
    exitCode: number | null;
    model: string | null;
    eventLines: number;
    stdoutPath: string | null;
    stderrPath: string | null;
    durationMs: number | null;
  };
  pass: boolean;
}

const cwd = process.cwd();
const evidenceDir = resolve(cwd, '.evidence/codex-runtime');
const projectConfigPath = resolve(cwd, '.codex/config.toml');
const templateConfigPath = resolve(cwd, 'templates/codex-hooks/config.toml');
const projectHooksPath = resolve(cwd, '.codex/hooks.json');
const templateHooksPath = resolve(cwd, 'templates/codex-hooks/hooks.json');
const hooksPath = existsSync(projectHooksPath) ? projectHooksPath : templateHooksPath;
const shouldRunLive = process.env.AI_STARTER_RUN_CODEX_RUNTIME === '1';
const requireHookEvents = process.env.AI_STARTER_REQUIRE_CODEX_HOOK_EVENTS === '1';

const EXPECTED_HOOKS: Record<string, string[]> = {
  SessionStart: ['session-startup.py'],
  UserPromptSubmit: ['user-prompt-submit.py'],
  PreToolUse: ['pretool-install-research.py', 'pretool-plan-gate.py'],
  PostToolUse: ['posttool-telemetry.py', 'posttool-scaffold.py'],
  Stop: ['stop-check.py'],
};

const CODEX_HOOK_SCRIPTS = [
  'starter_hook_utils.py',
  'session-startup.py',
  'user-prompt-submit.py',
  'pretool-install-research.py',
  'pretool-plan-gate.py',
  'periodic-reground.py',
  'posttool-telemetry.py',
  'posttool-scaffold.py',
  'posttool-failure-telemetry.py',
  'stop-check.py',
];

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function commandOutput(command: string, args: string[]): string | null {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'ignore'],
      timeout: 15_000,
    }).trim();
  } catch {
    return null;
  }
}

function codexVersion(): string | null {
  return commandOutput('codex', ['--version']);
}

function flattenHookCommands(settings: unknown, event: string): string[] {
  const hooks = (settings as { hooks?: Record<string, unknown> }).hooks?.[event];
  if (!Array.isArray(hooks)) return [];

  const commands: string[] = [];
  for (const group of hooks) {
    const groupHooks = (group as { hooks?: unknown }).hooks;
    if (!Array.isArray(groupHooks)) continue;
    for (const hook of groupHooks) {
      const command = (hook as { command?: unknown }).command;
      if (typeof command === 'string') commands.push(command);
    }
  }
  return commands;
}

function buildStaticChecks(): StaticHookCheck[] {
  const settings = readJson<Record<string, unknown>>(hooksPath, {});
  return Object.entries(EXPECTED_HOOKS).map(([event, expected]) => {
    const commands = flattenHookCommands(settings, event);
    const found = expected.filter(item => commands.some(command => command.includes(item)));
    const missing = expected.filter(item => !found.includes(item));
    return {
      event,
      expected,
      found,
      missing,
      pass: missing.length === 0,
    };
  });
}

function buildConfigChecks() {
  const configPath = existsSync(projectConfigPath) ? projectConfigPath : templateConfigPath;
  const config = existsSync(configPath) ? readFileSync(configPath, 'utf-8') : '';
  return [
    {
      name: 'codex hooks feature flag',
      pass: /codex_hooks\s*=\s*true/.test(config),
      detail: `${configPath} enables [features].codex_hooks`,
    },
    {
      name: 'OpenAI Docs MCP',
      pass: /openaiDeveloperDocs|developers\.openai\.com\/mcp/.test(config),
      detail: `${configPath} configures the OpenAI developer docs MCP server`,
    },
    {
      name: 'hooks.json present',
      pass: existsSync(projectHooksPath) || existsSync(templateHooksPath),
      detail: 'Codex hook config is available in project or package templates',
    },
  ];
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function nowIso(): string {
  return new Date().toISOString();
}

function copyCodexHookScripts(root: string): void {
  const target = join(root, '.codex/hooks');
  mkdirSync(target, { recursive: true });
  for (const script of CODEX_HOOK_SCRIPTS) {
    const src = [
      resolve(cwd, 'templates/codex-hooks', script),
      resolve(cwd, 'templates/claude-hooks', script),
      resolve(cwd, '.codex/hooks', script),
      resolve(cwd, '.claude/hooks', script),
    ].find(candidate => existsSync(candidate));
    if (src) cpSync(src, join(target, script));
  }
}

function createCodexFixture(options: { activePlan?: boolean; scorecard?: 'clean' | 'missing' } = {}) {
  const root = mkdtempSync(join(tmpdir(), 'ai-starter-codex-proof-'));
  copyCodexHookScripts(root);
  const planId = 'plan-codex-proof';
  writeJson(join(root, '.ai-starter-kit.json'), { version: 'codex-proof', installedAt: nowIso() });
  writeJson(join(root, '.ai-starter/manifests/companions.json'), { updatedAt: nowIso(), tasks: [] });
  writeJson(join(root, '.ai-starter/manifests/evidence.json'), []);
  writeJson(join(root, '.ai-starter/manifests/browser-proof.json'), {
    required: true,
    playwrightRequired: true,
    expectRequired: true,
    browserUseAdapter: 'planned',
    replayPaths: [],
    flowPaths: [],
    screenshotPaths: [],
    expectProbeCount: 0,
    expectCommandCount: 0,
    expectFailedCommandCount: 0,
    expectBlockingFailedCommandCount: 0,
    expectOpenOk: false,
    expectProofOk: false,
    expectScreenshotCount: 0,
    expectVideoCount: 0,
    lastReplayPath: null,
  });
  mkdirSync(join(root, '.ai-starter/runs'), { recursive: true });
  writeFileSync(join(root, '.ai-starter/runs/telemetry.jsonl'), '', 'utf-8');
  if (options.activePlan) {
    writeJson(join(root, '.ai-starter/plans/latest.json'), {
      id: planId,
      status: 'active',
      title: 'Codex runtime proof plan',
      classification: 'feature',
      acceptanceCriteria: ['Plan gate works', 'Stop gate works'],
      requiredEvidence: ['scorecard'],
    });
  }
  writeJson(join(root, '.ai-starter/session.json'), {
    currentPlanId: options.activePlan ? planId : null,
    currentTask: options.activePlan ? 'Codex runtime proof plan' : 'No active task yet',
    lastDecision: null,
    openGaps: [],
    modifiedFiles: [],
    updatedAt: nowIso(),
  });
  writeJson(join(root, '.ai-starter/progress.json'), {
    currentPlanId: options.activePlan ? planId : null,
    openTasks: [],
    closedTasks: [],
    filesInFlight: [],
    evidenceStatus: [],
    updatedAt: nowIso(),
  });
  if (options.scorecard === 'clean') {
    writeJson(join(root, '.ai-starter/runs/latest-scorecard.json'), {
      planId,
      score: 100,
      blockers: [],
    });
  }
  return root;
}

function runFixtureHook(root: string, script: string, payload: unknown) {
  const result = spawnSync('python3', [join(root, '.codex/hooks', script)], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: 'utf-8',
  });
  const telemetryPath = join(root, '.ai-starter/runs/telemetry.jsonl');
  const telemetry = existsSync(telemetryPath) ? readFileSync(telemetryPath, 'utf-8') : '';
  return {
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    telemetry,
  };
}

function buildBehaviorChecks() {
  const writePayload = {
    tool_name: 'Write',
    tool_input: {
      file_path: 'components/CodexProbe.tsx',
      content: 'export function CodexProbe() { return null; }',
    },
  };
  const planGateRoot = createCodexFixture();
  const planGate = runFixtureHook(planGateRoot, 'pretool-plan-gate.py', writePayload);
  const stopRoot = createCodexFixture({ activePlan: true });
  const stopGate = runFixtureHook(stopRoot, 'stop-check.py', { stop_hook_active: false });
  return [
    {
      name: 'Codex PreToolUse plan gate blocks implementation writes without plan',
      pass: planGate.exitCode !== 0 &&
        planGate.stderr.includes('no active plan') &&
        planGate.telemetry.includes('"runtime": "codex"') &&
        planGate.telemetry.includes('"outcome": "blocked"'),
      detail: `exit=${planGate.exitCode}`,
    },
    {
      name: 'Codex Stop gate blocks active plan without scorecard',
      pass: stopGate.exitCode !== 0 &&
        stopGate.stderr.includes('scorecard') &&
        stopGate.telemetry.includes('"runtime": "codex"') &&
        stopGate.telemetry.includes('"outcome": "blocked"'),
      detail: `exit=${stopGate.exitCode}`,
    },
  ];
}

function lineLooksLikeCodexEvent(line: string): boolean {
  try {
    const parsed = JSON.parse(line) as { type?: string };
    return typeof parsed.type === 'string';
  } catch {
    return /thread\.|turn\.|item\.|hook|error/i.test(line);
  }
}

function runLiveCodex() {
  const startedAt = Date.now();
  const model = process.env.AI_STARTER_CODEX_MODEL ?? 'gpt-5.2';
  const prompt = [
    'Read .ai-starter/runs/latest-scorecard.json if it exists.',
    'Do not edit files.',
    'Answer in one sentence with the current starter score or say that no scorecard exists.',
  ].join(' ');

  const result = spawnSync('codex', [
    'exec',
    '--model',
    model,
    '--json',
    '--sandbox',
    'read-only',
    '--skip-git-repo-check',
    prompt,
  ], {
    cwd,
    encoding: 'utf-8',
    timeout: 180_000,
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const stdoutPath = join(evidenceDir, 'codex-runtime.stdout.jsonl');
  const stderrPath = join(evidenceDir, 'codex-runtime.stderr.txt');
  writeFileSync(stdoutPath, stdout, 'utf-8');
  writeFileSync(stderrPath, stderr, 'utf-8');

  return {
    exitCode: result.status ?? 1,
    model,
    eventLines: stdout.split('\n').filter(lineLooksLikeCodexEvent).length,
    stdoutPath,
    stderrPath,
    durationMs: Date.now() - startedAt,
  };
}

function writeReport(report: CodexRuntimeProofReport): void {
  mkdirSync(dirname(join(evidenceDir, 'report.json')), { recursive: true });
  writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
  writeFileSync(
    join(evidenceDir, 'report.md'),
    [
      '# Codex Runtime Proof',
      '',
      `- pass: ${report.pass}`,
      `- mode: ${report.runtime.attempted ? 'live' : 'static'}`,
      `- codex cli: ${report.codexCliFound ? report.codexVersion : 'missing'}`,
      `- event lines: ${report.runtime.eventLines}`,
      `- skipped reason: ${report.runtime.skippedReason ?? 'none'}`,
      '',
    ].join('\n'),
    'utf-8',
  );
}

function appendRuntimeProofTelemetry(report: CodexRuntimeProofReport): void {
  if (!report.pass) return;
  const telemetryPath = resolve(cwd, '.ai-starter/runs/telemetry.jsonl');
  mkdirSync(dirname(telemetryPath), { recursive: true });
  appendFileSync(
    telemetryPath,
    JSON.stringify({
      id: `codex-runtime-proof-${Date.now()}`,
      timestamp: report.generatedAt,
      phase: 'CodexRuntimeProof',
      hook: 'codex-runtime-proof.ts',
      outcome: 'observed',
      classification: 'observer',
      blocks: false,
      matcher: null,
      gate: 'runtime-proof',
      tool: 'codex exec',
      command: report.runtime.attempted ? 'codex exec --json' : 'static codex runtime proof',
      paths: ['.codex/config.toml', '.codex/hooks.json'],
      surfaceTypes: ['starter'],
      planId: null,
      currentTask: 'Codex runtime proof',
      reason: report.runtime.attempted ? 'live-codex-proof-passed' : 'static-codex-proof-passed',
      runtime: 'codex',
      details: {
        runtime: 'codex',
        codexCliFound: report.codexCliFound,
        codexVersion: report.codexVersion,
        mode: report.runtime.attempted ? 'live' : 'static',
        eventLines: report.runtime.eventLines,
        evidence: '.evidence/codex-runtime/report.json',
      },
    }) + '\n',
    'utf-8',
  );
}

function main(): void {
  mkdirSync(evidenceDir, { recursive: true });
  const version = codexVersion();
  const configChecks = buildConfigChecks();
  const staticChecks = buildStaticChecks();
  const behaviorChecks = buildBehaviorChecks();
  const staticPass = staticChecks.every(check => check.pass) &&
    configChecks.every(check => check.pass) &&
    behaviorChecks.every(check => check.pass);

  let runtime: CodexRuntimeProofReport['runtime'] = {
    attempted: false,
    skippedReason: shouldRunLive ? null : 'Set AI_STARTER_RUN_CODEX_RUNTIME=1 to run a live codex exec proof.',
    exitCode: null,
    model: null,
    eventLines: 0,
    stdoutPath: null,
    stderrPath: null,
    durationMs: null,
  };

  if (shouldRunLive) {
    if (!version) {
      runtime.skippedReason = 'Codex CLI not found on PATH.';
    } else {
      runtime = {
        attempted: true,
        skippedReason: null,
        ...runLiveCodex(),
      };
    }
  }

  const livePass = !runtime.attempted
    ? true
    : runtime.exitCode === 0 && (!requireHookEvents || runtime.eventLines > 0);

  const report: CodexRuntimeProofReport = {
    generatedAt: new Date().toISOString(),
    projectRoot: cwd,
    configPath: projectConfigPath,
    hooksPath,
    codexCliFound: Boolean(version),
    codexVersion: version,
    configChecks,
    staticChecks,
    behaviorChecks,
    runtime,
    pass: staticPass && livePass,
  };

  writeReport(report);
  appendRuntimeProofTelemetry(report);
  console.log(`codex-runtime=${report.pass ? 'pass' : 'fail'}`);
  console.log(`mode=${runtime.attempted ? 'live' : 'static'}`);
  console.log('evidence=.evidence/codex-runtime/report.json');

  if (!report.pass) {
    console.error(JSON.stringify({
      failedConfigChecks: configChecks.filter(check => !check.pass),
      missingStaticHooks: staticChecks.filter(check => !check.pass),
      failedBehaviorChecks: behaviorChecks.filter(check => !check.pass),
      runtime,
    }, null, 2));
    process.exit(1);
  }
}

main();
