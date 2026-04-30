#!/usr/bin/env tsx

import { execFileSync, spawnSync } from 'child_process';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { dirname, join, resolve } from 'path';

interface StaticHookCheck {
  event: string;
  expected: string[];
  found: string[];
  missing: string[];
  pass: boolean;
}

interface ClaudeRuntimeProofReport {
  generatedAt: string;
  projectRoot: string;
  settingsPath: string;
  claudeCliFound: boolean;
  claudeVersion: string | null;
  staticChecks: StaticHookCheck[];
  runtime: {
    attempted: boolean;
    skippedReason: string | null;
    model: string | null;
    maxBudgetUsd: string | null;
    exitCode: number | null;
    hookEventLines: number;
    stdoutPath: string | null;
    stderrPath: string | null;
    durationMs: number | null;
  };
  pass: boolean;
}

const cwd = process.cwd();
const evidenceDir = resolve(cwd, '.evidence/claude-runtime');
const projectSettingsPath = resolve(cwd, '.claude/settings.json');
const templateSettingsPath = resolve(cwd, 'templates/claude-hooks/settings.json');
const settingsPath = existsSync(projectSettingsPath) ? projectSettingsPath : templateSettingsPath;
const shouldRunLive = process.env.AI_STARTER_RUN_CLAUDE_RUNTIME === '1';
const requireHookEvents = process.env.AI_STARTER_REQUIRE_CLAUDE_HOOK_EVENTS === '1';
const liveModel = process.env.AI_STARTER_CLAUDE_MODEL ?? 'sonnet';
const liveMaxBudgetUsd = process.env.AI_STARTER_CLAUDE_MAX_BUDGET_USD ?? '0.25';

const EXPECTED_HOOKS: Record<string, string[]> = {
  InstructionsLoaded: ['instructions-loaded.py'],
  SessionStart: ['session-startup.py'],
  PreToolUse: ['pretool-install-research.py', 'pretool-plan-gate.py'],
  PostToolUse: ['posttool-telemetry.py', 'posttool-scaffold.py', 'postuse-format.py'],
  PostToolUseFailure: ['posttool-failure-telemetry.py'],
  Stop: ['stop-check.py'],
};

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

function claudeVersion(): string | null {
  return commandOutput('claude', ['--version']);
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
  const settings = readJson<Record<string, unknown>>(settingsPath, {});
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

function lineLooksLikeHookEvent(line: string): boolean {
  const lower = line.toLowerCase();
  return lower.includes('hook') || Object.values(EXPECTED_HOOKS).flat().some(name => lower.includes(name.toLowerCase()));
}

function runLiveClaude() {
  const startedAt = Date.now();
  const prompt = [
    'Use the Read tool once to inspect .ai-starter/runs/latest-scorecard.json if it exists.',
    'Then answer in one short sentence with the current score or say that no scorecard exists.',
    'Do not edit files.',
  ].join(' ');

  const result = spawnSync('claude', [
    '--print',
    '--output-format',
    'stream-json',
    '--verbose',
    '--include-hook-events',
    '--no-session-persistence',
    '--model',
    liveModel,
    '--max-budget-usd',
    liveMaxBudgetUsd,
    '--permission-mode',
    'bypassPermissions',
    prompt,
  ], {
    cwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: cwd,
    },
    timeout: 180_000,
  });

  const stdout = result.stdout ?? '';
  const stderr = result.stderr ?? '';
  const stdoutPath = join(evidenceDir, 'claude-runtime.stdout.jsonl');
  const stderrPath = join(evidenceDir, 'claude-runtime.stderr.txt');
  writeFileSync(stdoutPath, stdout, 'utf-8');
  writeFileSync(stderrPath, stderr, 'utf-8');

  return {
    exitCode: result.status ?? 1,
    hookEventLines: stdout.split('\n').filter(lineLooksLikeHookEvent).length,
    stdoutPath,
    stderrPath,
    durationMs: Date.now() - startedAt,
  };
}

function writeReport(report: ClaudeRuntimeProofReport): void {
  mkdirSync(dirname(join(evidenceDir, 'report.json')), { recursive: true });
  writeFileSync(join(evidenceDir, 'report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
  writeFileSync(
    join(evidenceDir, 'report.md'),
    [
      '# Claude Runtime Proof',
      '',
      `- pass: ${report.pass}`,
      `- mode: ${report.runtime.attempted ? 'live' : 'static'}`,
      `- claude cli: ${report.claudeCliFound ? report.claudeVersion : 'missing'}`,
      `- live model: ${report.runtime.model ?? 'none'}`,
      `- max budget: ${report.runtime.maxBudgetUsd ?? 'none'}`,
      `- hook event lines: ${report.runtime.hookEventLines}`,
      `- skipped reason: ${report.runtime.skippedReason ?? 'none'}`,
      '',
    ].join('\n'),
    'utf-8',
  );
}

function main(): void {
  mkdirSync(evidenceDir, { recursive: true });
  const version = claudeVersion();
  const staticChecks = buildStaticChecks();
  const staticPass = existsSync(settingsPath) && staticChecks.every(check => check.pass);

  let runtime: ClaudeRuntimeProofReport['runtime'] = {
    attempted: false,
    skippedReason: shouldRunLive ? null : 'Set AI_STARTER_RUN_CLAUDE_RUNTIME=1 to run a live Claude Code proof.',
    model: shouldRunLive ? liveModel : null,
    maxBudgetUsd: shouldRunLive ? liveMaxBudgetUsd : null,
    exitCode: null,
    hookEventLines: 0,
    stdoutPath: null,
    stderrPath: null,
    durationMs: null,
  };

  if (shouldRunLive) {
    if (!version) {
      runtime.skippedReason = 'Claude CLI not found on PATH.';
    } else {
      const live = runLiveClaude();
      runtime = {
        attempted: true,
        skippedReason: null,
        model: liveModel,
        maxBudgetUsd: liveMaxBudgetUsd,
        ...live,
      };
    }
  }

  const livePass = !runtime.attempted
    ? true
    : runtime.exitCode === 0 && (!requireHookEvents || runtime.hookEventLines > 0);

  const report: ClaudeRuntimeProofReport = {
    generatedAt: new Date().toISOString(),
    projectRoot: cwd,
    settingsPath,
    claudeCliFound: Boolean(version),
    claudeVersion: version,
    staticChecks,
    runtime,
    pass: staticPass && livePass,
  };

  writeReport(report);
  console.log(`claude-runtime=${report.pass ? 'pass' : 'fail'}`);
  console.log(`mode=${runtime.attempted ? 'live' : 'static'}`);
  console.log('evidence=.evidence/claude-runtime/report.json');

  if (!report.pass) {
    console.error(JSON.stringify({
      missingStaticHooks: staticChecks.filter(check => !check.pass),
      runtime,
    }, null, 2));
    process.exit(1);
  }
}

main();
