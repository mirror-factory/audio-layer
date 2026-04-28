#!/usr/bin/env tsx

import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { syncStarterSystem } from './ai-starter-core.js';

interface HookRun {
  hook: string;
  exitCode: number;
  stdout: string;
  stderr: string;
}

interface ScenarioAssertion {
  name: string;
  pass: boolean;
  expected: string;
  actual: string;
}

interface ScenarioResult {
  id: string;
  name: string;
  pass: boolean;
  fixtureRoot: string;
  assertions: ScenarioAssertion[];
  hooks: HookRun[];
  evidence: Record<string, unknown>;
}

interface ScenarioReport {
  generatedAt: string;
  projectRoot: string;
  hooksSource: string;
  controlPlane: {
    baseUrl: string | null;
    required: boolean;
    checked: boolean;
  };
  total: number;
  passed: number;
  failed: number;
  scenarios: ScenarioResult[];
}

const cwd = process.cwd();
const scenarioRoot = mkdtempSync(join(tmpdir(), 'ai-starter-claude-scenarios-'));
const keepFixtures = process.env.AI_STARTER_KEEP_SCENARIO_FIXTURES === '1';
const controlPlaneBaseUrl = process.env.AI_STARTER_BASE_URL ?? null;
const requireControlPlane = process.env.AI_STARTER_REQUIRE_CONTROL_PLANE === '1';

function nowIso(): string {
  return new Date().toISOString();
}

function readJson<T>(path: string, fallback: T): T {
  try {
    return JSON.parse(readFileSync(path, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function writeJson(path: string, value: unknown): void {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, JSON.stringify(value, null, 2) + '\n', 'utf-8');
}

function findHooksDir(): string {
  const candidates = [
    resolve(cwd, '.claude/hooks'),
    resolve(cwd, 'templates/claude-hooks'),
    resolve(cwd, '../templates/claude-hooks'),
  ];
  const found = candidates.find(candidate => existsSync(join(candidate, 'starter_hook_utils.py')));
  if (!found) {
    throw new Error('Could not find Claude hook scripts. Expected .claude/hooks or templates/claude-hooks.');
  }
  return found;
}

const hooksSource = findHooksDir();

function createFixture(options: {
  activePlan?: boolean;
  research?: 'fresh' | 'missing';
  scorecard?: 'clean' | 'blocked' | 'missing';
} = {}): string {
  const root = mkdtempSync(join(scenarioRoot, 'case-'));
  cpSync(hooksSource, join(root, '.claude/hooks'), { recursive: true });
  mkdirSync(join(root, 'app/api/transcribe'), { recursive: true });
  mkdirSync(join(root, 'components'), { recursive: true });

  const planId = 'plan-claude-scenario';
  writeJson(join(root, 'package.json'), {
    name: 'ai-starter-claude-scenario',
    private: true,
    type: 'module',
    scripts: {
      plan: 'tsx scripts/plan-task.ts',
      score: 'tsx scripts/score-starter.ts',
    },
  });
  writeJson(join(root, '.ai-starter-kit.json'), {
    version: 'scenario-harness',
    installedAt: nowIso(),
    policyProfile: 'strict',
  });
  writeJson(join(root, '.ai-starter/manifests/starter.json'), {
    version: 'scenario-harness',
    installedAt: nowIso(),
    updatedAt: nowIso(),
    policyProfile: 'strict',
    enabledModules: ['hooks', 'research', 'companions', 'control-plane'],
    commands: ['plan', 'score', 'report', 'iterate'],
  });
  writeJson(join(root, '.ai-starter/manifests/docs.json'), []);
  writeJson(join(root, '.ai-starter/manifests/companions.json'), { updatedAt: nowIso(), tasks: [] });
  writeJson(join(root, '.ai-starter/manifests/evidence.json'), []);
  writeJson(join(root, '.ai-starter/manifests/features.json'), []);
  mkdirSync(join(root, '.ai-starter/runs'), { recursive: true });
  writeFileSync(join(root, '.ai-starter/runs/telemetry.jsonl'), '', 'utf-8');

  if (options.activePlan) {
    writeJson(join(root, '.ai-starter/plans/latest.json'), {
      id: planId,
      status: 'active',
      title: 'Add transcription API with proof',
      classification: 'feature',
      acceptanceCriteria: ['API route exists', 'Contract test exists', 'Cost event is recorded'],
      requiredEvidence: ['contract-test', 'usage-event'],
      verificationCommands: ['pnpm test', 'pnpm score'],
    });
  }

  writeJson(join(root, '.ai-starter/session.json'), {
    currentPlanId: options.activePlan ? planId : null,
    currentTask: options.activePlan ? 'Add transcription API with proof' : 'No active task yet',
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

  if (options.research === 'fresh') {
    writeJson(join(root, '.claude/research/index.json'), {
      entries: [
        {
          id: 'assemblyai',
          library: 'assemblyai',
          docsUrl: 'https://www.assemblyai.com/docs',
          lastFetched: nowIso(),
          validUntil: nowIso(),
        },
      ],
    });
  }

  if (options.scorecard === 'clean') {
    writeJson(join(root, '.ai-starter/runs/latest-scorecard.json'), {
      planId,
      score: 100,
      blockers: [],
    });
    writeJson(join(root, '.evidence/gates/summary.json'), {
      required: { total: 1, passed: 1, failed: 0 },
    });
  }

  if (options.scorecard === 'blocked') {
    writeJson(join(root, '.ai-starter/runs/latest-scorecard.json'), {
      planId,
      score: 42,
      blockers: ['Missing contract test evidence.'],
    });
    writeJson(join(root, '.evidence/gates/summary.json'), {
      required: { total: 1, passed: 1, failed: 0 },
    });
  }

  return root;
}

function runHook(root: string, hook: string, payload: unknown = {}): HookRun {
  const result = spawnSync('python3', [join(root, '.claude/hooks', hook)], {
    cwd: root,
    input: JSON.stringify(payload),
    encoding: 'utf-8',
    env: {
      ...process.env,
      CLAUDE_PROJECT_DIR: root,
    },
  });
  return {
    hook,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
  };
}

function readTelemetry(root: string): Array<Record<string, unknown>> {
  const path = join(root, '.ai-starter/runs/telemetry.jsonl');
  if (!existsSync(path)) return [];
  return readFileSync(path, 'utf-8')
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => {
      try {
        return JSON.parse(line) as Record<string, unknown>;
      } catch {
        return {};
      }
    });
}

function assertion(name: string, pass: boolean, expected: string, actual: string): ScenarioAssertion {
  return { name, pass, expected, actual };
}

function writePayload(path = 'app/api/transcribe/route.ts') {
  return {
    session_id: 'scenario-session',
    tool_name: 'Write',
    tool_input: {
      file_path: path,
      content: 'export async function POST() { return Response.json({ ok: true }); }\n',
    },
  };
}

function runScenario(
  id: string,
  name: string,
  execute: () => Omit<ScenarioResult, 'id' | 'name' | 'pass'>,
): ScenarioResult {
  const result = execute();
  const pass = result.assertions.every(item => item.pass);
  return { id, name, pass, ...result };
}

async function fetchControlPlaneScenario(): Promise<ScenarioResult> {
  const root = createFixture({ activePlan: true });
  const hook = runHook(root, 'posttool-telemetry.py', writePayload('components/ScenarioProbe.tsx'));
  const localEvents = readTelemetry(root);
  const assertions: ScenarioAssertion[] = [
    assertion(
      'local telemetry jsonl records hook event',
      localEvents.some(event => event.hook === 'posttool-telemetry.py' && event.outcome === 'observed'),
      'posttool telemetry event in .ai-starter/runs/telemetry.jsonl',
      `${localEvents.length} local event(s)`,
    ),
  ];

  const evidence: Record<string, unknown> = {
    localTelemetryEvents: localEvents.length,
    controlPlaneChecked: Boolean(controlPlaneBaseUrl),
  };

  if (controlPlaneBaseUrl) {
    try {
      const response = await fetch(`${controlPlaneBaseUrl.replace(/\/$/, '')}/api/control-plane`, {
        cache: 'no-store',
      });
      const text = await response.text();
      const payload = response.ok ? JSON.parse(text) as {
        data?: { counts?: { telemetryEvents?: number }; hooks?: { observedEvents?: number } };
      } : null;
      const observedEvents = payload?.data?.hooks?.observedEvents ?? payload?.data?.counts?.telemetryEvents ?? 0;
      evidence.controlPlaneStatus = response.status;
      evidence.controlPlaneObservedEvents = observedEvents;
      assertions.push(assertion(
        'control-plane exposes hook telemetry',
        response.ok && observedEvents > 0,
        'HTTP 200 and observedEvents > 0',
        `status=${response.status}, observedEvents=${observedEvents}`,
      ));
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      evidence.controlPlaneError = message;
      assertions.push(assertion(
        'control-plane exposes hook telemetry',
        !requireControlPlane,
        requireControlPlane ? 'reachable /api/control-plane' : 'optional unless AI_STARTER_REQUIRE_CONTROL_PLANE=1',
        message,
      ));
    }
  } else {
    assertions.push(assertion(
      'control-plane check is configured when required',
      !requireControlPlane,
      'AI_STARTER_BASE_URL set when AI_STARTER_REQUIRE_CONTROL_PLANE=1',
      'AI_STARTER_BASE_URL not set',
    ));
  }

  return {
    id: 'telemetry-control-plane',
    name: 'Telemetry appears locally and in the control plane when a server is configured',
    pass: assertions.every(item => item.pass),
    fixtureRoot: root,
    assertions,
    hooks: [hook],
    evidence,
  };
}

async function main(): Promise<void> {
  const scenarios: ScenarioResult[] = [
    runScenario('plan-required', 'Feature writes without an active plan are blocked', () => {
      const root = createFixture();
      const hook = runHook(root, 'pretool-plan-gate.py', writePayload());
      const events = readTelemetry(root);
      return {
        fixtureRoot: root,
        hooks: [hook],
        assertions: [
          assertion('hook exits non-zero', hook.exitCode !== 0, 'non-zero exit', `exit=${hook.exitCode}`),
          assertion('stderr explains missing plan', hook.stderr.includes('no active plan'), 'message mentions no active plan', hook.stderr.trim()),
          assertion(
            'blocked telemetry recorded',
            events.some(event => event.hook === 'pretool-plan-gate.py' && event.outcome === 'blocked'),
            'blocked pretool-plan-gate event',
            `${events.length} event(s)`,
          ),
        ],
        evidence: { telemetryEvents: events.length },
      };
    }),
    runScenario('research-required', 'Dependency/API changes without fresh research are blocked', () => {
      const root = createFixture({ research: 'missing' });
      const hook = runHook(root, 'pretool-install-research.py', {
        session_id: 'scenario-session',
        tool_name: 'Bash',
        tool_input: { command: 'pnpm add assemblyai' },
      });
      const events = readTelemetry(root);
      return {
        fixtureRoot: root,
        hooks: [hook],
        assertions: [
          assertion('hook exits non-zero', hook.exitCode !== 0, 'non-zero exit', `exit=${hook.exitCode}`),
          assertion('stderr explains stale research', hook.stderr.includes('research'), 'message mentions research', hook.stderr.trim()),
          assertion(
            'blocked research telemetry recorded',
            events.some(event => event.hook === 'pretool-install-research.py' && event.outcome === 'blocked'),
            'blocked pretool-install-research event',
            `${events.length} event(s)`,
          ),
        ],
        evidence: { telemetryEvents: events.length },
      };
    }),
    runScenario('companion-scaffolding', 'Post-write companion obligations are recorded for new APIs', () => {
      const root = createFixture({ activePlan: true, research: 'fresh' });
      const hook = runHook(root, 'posttool-scaffold.py', writePayload());
      const companions = readJson<{ tasks?: Array<{ id?: string; path?: string; status?: string; missing?: string[] }> }>(
        join(root, '.ai-starter/manifests/companions.json'),
        {},
      );
      const progress = readJson<{ openTasks?: string[] }>(join(root, '.ai-starter/progress.json'), {});
      const task = companions.tasks?.find(item => item.path === 'app/api/transcribe/route.ts');
      return {
        fixtureRoot: root,
        hooks: [hook],
        assertions: [
          assertion('hook exits cleanly', hook.exitCode === 0, 'zero exit', `exit=${hook.exitCode}`),
          assertion('api companion task exists', Boolean(task), 'companion task for app/api/transcribe/route.ts', task ? JSON.stringify(task) : 'missing'),
          assertion('api companion task is pending', task?.status === 'pending', 'pending task', task?.status ?? 'missing'),
          assertion(
            'api companion task includes contract coverage',
            Boolean(task?.missing?.includes('contract-check')),
            'missing includes contract-check',
            JSON.stringify(task?.missing ?? []),
          ),
          assertion(
            'progress open tasks include companion work',
            Boolean(progress.openTasks?.some(item => item.includes('app/api/transcribe/route.ts'))),
            'progress openTasks mention API companion work',
            JSON.stringify(progress.openTasks ?? []),
          ),
        ],
        evidence: { companionTask: task ?? null, openTasks: progress.openTasks ?? [] },
      };
    }),
    runScenario('stop-missing-evidence', 'Stop is blocked when an active plan has no scorecard evidence', () => {
      const root = createFixture({ activePlan: true, scorecard: 'missing' });
      const hook = runHook(root, 'stop-check.py', { session_id: 'scenario-session' });
      const events = readTelemetry(root);
      return {
        fixtureRoot: root,
        hooks: [hook],
        assertions: [
          assertion('hook exits non-zero', hook.exitCode !== 0, 'non-zero exit', `exit=${hook.exitCode}`),
          assertion('stderr asks for score', hook.stderr.includes('pnpm score'), 'message asks for pnpm score', hook.stderr.trim()),
          assertion(
            'stop blocked telemetry recorded',
            events.some(event => event.hook === 'stop-check.py' && event.outcome === 'blocked' && event.reason === 'autopilot-missing-scorecard'),
            'autopilot-missing-scorecard blocked event',
            `${events.length} event(s)`,
          ),
        ],
        evidence: { telemetryEvents: events.length },
      };
    }),
    await fetchControlPlaneScenario(),
  ];

  const report: ScenarioReport = {
    generatedAt: nowIso(),
    projectRoot: cwd,
    hooksSource,
    controlPlane: {
      baseUrl: controlPlaneBaseUrl,
      required: requireControlPlane,
      checked: Boolean(controlPlaneBaseUrl),
    },
    total: scenarios.length,
    passed: scenarios.filter(item => item.pass).length,
    failed: scenarios.filter(item => !item.pass).length,
    scenarios,
  };

  const evidenceDir = resolve(cwd, '.evidence/claude-scenarios');
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'claude-scenario-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
  writeFileSync(
    join(evidenceDir, 'claude-scenario-report.md'),
    [
      '# Claude Scenario Harness',
      '',
      `Generated: ${report.generatedAt}`,
      `Hooks source: ${report.hooksSource}`,
      `Result: ${report.passed}/${report.total} passed`,
      '',
      ...report.scenarios.map(scenario => [
        `## ${scenario.pass ? 'PASS' : 'FAIL'} ${scenario.name}`,
        '',
        ...scenario.assertions.map(item => `- ${item.pass ? 'PASS' : 'FAIL'} ${item.name}: ${item.actual}`),
        '',
      ].join('\n')),
    ].join('\n'),
    'utf-8',
  );

  if (existsSync(resolve(cwd, '.ai-starter-kit.json'))) {
    syncStarterSystem({ cwd });
  }

  if (!keepFixtures) {
    rmSync(scenarioRoot, { recursive: true, force: true });
  }

  console.log(`claude-scenarios=${report.passed}/${report.total}`);
  console.log('evidence=.evidence/claude-scenarios/claude-scenario-report.json');

  if (report.failed > 0) {
    for (const scenario of report.scenarios.filter(item => !item.pass)) {
      console.error(`${scenario.id}: ${scenario.name}`);
      for (const item of scenario.assertions.filter(assertionItem => !assertionItem.pass)) {
        console.error(`- ${item.name}: expected ${item.expected}, got ${item.actual}`);
      }
    }
    process.exit(1);
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.stack ?? error.message : String(error));
  process.exit(1);
});
