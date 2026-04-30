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

interface HookTestResult {
  name: string;
  pass: boolean;
  hook: string;
  expected: string;
  actual: string;
  stdout: string;
  stderr: string;
  details: string[];
}

interface HookTestReport {
  generatedAt: string;
  sourceHooksDir: string;
  total: number;
  passed: number;
  failed: number;
  results: HookTestResult[];
}

const cwd = process.cwd();
const fixtureRoot = mkdtempSync(join(tmpdir(), 'ai-starter-hook-test-'));

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

function createFixture(options: {
  activePlan?: boolean;
  scorecard?: 'clean' | 'blocked' | 'missing';
  research?: 'fresh' | 'missing';
  handoff?: boolean;
  pendingCompanion?: boolean;
  productValidation?: 'complete' | 'required-missing';
} = {}): string {
  const root = mkdtempSync(join(fixtureRoot, 'case-'));
  const hooksDir = findHooksDir();
  cpSync(hooksDir, join(root, '.claude/hooks'), { recursive: true });

  writeJson(join(root, '.ai-starter-kit.json'), {
    version: 'hook-test',
    installedAt: nowIso(),
  });
  writeJson(join(root, '.ai-starter/manifests/starter.json'), {
    version: 'hook-test',
    installedAt: nowIso(),
    updatedAt: nowIso(),
    policyProfile: 'strict',
    enabledModules: ['hooks'],
    commands: ['plan', 'score'],
  });
  writeJson(join(root, '.ai-starter/manifests/docs.json'), []);
  writeJson(join(root, '.ai-starter/manifests/product-spec.json'), {
    status: 'complete',
    source: 'agent-generated',
    customer: 'Hook test users',
    painfulProblem: 'Need hooks to preserve alignment',
    openQuestions: [],
  });
  writeJson(join(root, '.ai-starter/product-spec/latest.json'), {
    status: 'complete',
    source: 'agent-generated',
    customer: 'Hook test users',
    painfulProblem: 'Need hooks to preserve alignment',
    openQuestions: [],
  });
  writeJson(join(root, '.ai-starter/config.json'), {
    productValidation: {
      mode: options.productValidation === 'required-missing' ? 'required' : 'recommended',
    },
  });
  writeJson(join(root, '.ai-starter/manifests/product-validation.json'), {
    status: options.productValidation === 'required-missing' ? 'missing-inputs' : 'complete',
    mode: options.productValidation === 'required-missing' ? 'required' : 'recommended',
  });
  writeJson(join(root, '.ai-starter/product-validation/latest.json'), {
    status: options.productValidation === 'required-missing' ? 'missing-inputs' : 'complete',
    mode: options.productValidation === 'required-missing' ? 'required' : 'recommended',
  });
  writeJson(join(root, '.ai-starter/manifests/companions.json'), {
    updatedAt: nowIso(),
    tasks: options.pendingCompanion
      ? [
          {
            id: 'companion-components-hook-probe',
            path: 'components/HookProbe.tsx',
            status: 'pending',
            missing: ['unit-test', 'storybook-story', 'visual-check'],
          },
        ]
      : [],
  });
  writeJson(join(root, '.ai-starter/manifests/alignment.json'), {
    status: 'ready',
    summary: 'Hook test alignment',
    anchors: [{ id: 'product-spec', path: '.ai-starter/product-spec/latest.md' }],
    openGaps: [],
  });
  writeJson(join(root, '.ai-starter/alignment/latest.json'), {
    status: 'ready',
    summary: 'Hook test alignment',
    anchors: [{ id: 'product-spec', path: '.ai-starter/product-spec/latest.md' }],
    openGaps: [],
  });
  mkdirSync(join(root, '.ai-starter/runs'), { recursive: true });
  writeFileSync(join(root, '.ai-starter/runs/telemetry.jsonl'), '', 'utf-8');

  const planId = 'plan-hook-test';
  if (options.activePlan) {
    writeJson(join(root, '.ai-starter/plans/latest.json'), {
      id: planId,
      status: 'active',
      title: 'Hook test plan',
      classification: 'feature',
    });
  }

  writeJson(join(root, '.ai-starter/session.json'), {
    currentPlanId: options.activePlan ? planId : null,
    currentTask: options.activePlan ? 'Hook test plan' : 'No active task yet',
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
          id: 'nextjs',
          library: 'next',
          docsUrl: 'https://nextjs.org/docs',
          lastFetched: nowIso(),
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

  if (options.handoff) {
    mkdirSync(join(root, '.ai-starter/reports'), { recursive: true });
    writeFileSync(
      join(root, '.ai-starter/reports/latest.md'),
      '# Hook Test Handoff\n\nScore clear. Gates clear. Companion obligations satisfied. Evidence is ready for handoff.\n',
      'utf-8',
    );
    writeJson(join(root, '.ai-starter/exports/latest.json'), {
      id: 'hook-test-export',
      archivePath: join(root, '.ai-starter/exports/hook-test-export.tgz'),
      bytes: 100,
      included: ['.ai-starter'],
      warnings: [],
      createdAt: nowIso(),
    });
  }

  if (options.scorecard === 'blocked') {
    writeJson(join(root, '.ai-starter/runs/latest-scorecard.json'), {
      planId,
      score: 40,
      blockers: ['Missing browser evidence.'],
    });
    writeJson(join(root, '.evidence/gates/summary.json'), {
      required: { total: 1, passed: 1, failed: 0 },
    });
  }

  return root;
}

function runHook(root: string, hook: string, payload: unknown = {}): HookRun {
  const hookPath = join(root, '.claude/hooks', hook);
  const result = spawnSync('python3', [hookPath], {
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

function telemetry(root: string): Array<Record<string, unknown>> {
  const logPath = join(root, '.ai-starter/runs/telemetry.jsonl');
  if (!existsSync(logPath)) return [];
  return readFileSync(logPath, 'utf-8')
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

function expectTest(
  name: string,
  hook: string,
  setup: () => string,
  payload: unknown,
  assert: (root: string, run: HookRun) => { pass: boolean; expected: string; actual: string; details?: string[] },
): HookTestResult {
  const root = setup();
  const run = runHook(root, hook, payload);
  const assertion = assert(root, run);
  return {
    name,
    pass: assertion.pass,
    hook,
    expected: assertion.expected,
    actual: assertion.actual,
    stdout: run.stdout.trim(),
    stderr: run.stderr.trim(),
    details: assertion.details ?? [],
  };
}

const writePayload = {
  tool_name: 'Write',
  tool_input: {
    file_path: 'components/HookProbe.tsx',
    content: 'export function HookProbe() { return null; }',
  },
};

const tests: HookTestResult[] = [
  expectTest(
    'plan gate blocks implementation writes without an active plan',
    'pretool-plan-gate.py',
    () => createFixture(),
    writePayload,
    (root, run) => {
      const events = telemetry(root);
      const blocked = events.some(event => event.hook === 'pretool-plan-gate.py' && event.outcome === 'blocked');
      return {
        pass: run.exitCode !== 0 && blocked && run.stderr.includes('no active plan'),
        expected: 'non-zero exit and blocked telemetry event',
        actual: `exit=${run.exitCode}, blocked=${blocked}`,
      };
    },
  ),
  expectTest(
    'plan gate allows implementation writes with an active plan',
    'pretool-plan-gate.py',
    () => createFixture({ activePlan: true }),
    writePayload,
    (root, run) => {
      const events = telemetry(root);
      const allowed = events.some(event => event.hook === 'pretool-plan-gate.py' && event.outcome === 'allowed');
      return {
        pass: run.exitCode === 0 && allowed,
        expected: 'zero exit and allowed telemetry event',
        actual: `exit=${run.exitCode}, allowed=${allowed}`,
      };
    },
  ),
  expectTest(
    'plan gate blocks implementation writes when required product validation is missing',
    'pretool-plan-gate.py',
    () => createFixture({ activePlan: true, productValidation: 'required-missing' }),
    writePayload,
    (root, run) => {
      const events = telemetry(root);
      const blocked = events.some(event => event.hook === 'pretool-plan-gate.py' && event.reason === 'product-validation-required');
      return {
        pass: run.exitCode !== 0 && blocked && run.stderr.includes('product validation'),
        expected: 'non-zero exit and product validation blocked telemetry',
        actual: `exit=${run.exitCode}, blocked=${blocked}`,
      };
    },
  ),
  expectTest(
    'research gate blocks dependency installs when research is missing',
    'pretool-install-research.py',
    () => createFixture({ research: 'missing' }),
    { tool_name: 'Bash', tool_input: { command: 'pnpm add axios' } },
    (root, run) => {
      const events = telemetry(root);
      const blocked = events.some(event => event.hook === 'pretool-install-research.py' && event.outcome === 'blocked');
      return {
        pass: run.exitCode !== 0 && blocked && run.stderr.includes('research'),
        expected: 'non-zero exit and research blocked telemetry',
        actual: `exit=${run.exitCode}, blocked=${blocked}`,
      };
    },
  ),
  expectTest(
    'research gate allows dependency installs when research is fresh',
    'pretool-install-research.py',
    () => createFixture({ research: 'fresh' }),
    { tool_name: 'Bash', tool_input: { command: 'pnpm add axios' } },
    (root, run) => {
      const events = telemetry(root);
      const allowed = events.some(event => event.hook === 'pretool-install-research.py' && event.outcome === 'allowed');
      return {
        pass: run.exitCode === 0 && allowed,
        expected: 'zero exit and research allowed telemetry',
        actual: `exit=${run.exitCode}, allowed=${allowed}`,
      };
    },
  ),
  expectTest(
    'post-tool telemetry records changed paths into session and progress',
    'posttool-telemetry.py',
    () => createFixture(),
    writePayload,
    (root, run) => {
      const session = readJson<{ modifiedFiles?: string[] }>(join(root, '.ai-starter/session.json'), {});
      const progress = readJson<{ filesInFlight?: string[]; evidenceStatus?: string[] }>(join(root, '.ai-starter/progress.json'), {});
      const pathSeen = session.modifiedFiles?.includes('components/HookProbe.tsx') &&
        progress.filesInFlight?.includes('components/HookProbe.tsx') &&
        progress.evidenceStatus?.includes('observed-change:components/HookProbe.tsx');
      return {
        pass: run.exitCode === 0 && Boolean(pathSeen),
        expected: 'session/progress include components/HookProbe.tsx',
        actual: `exit=${run.exitCode}, pathSeen=${Boolean(pathSeen)}`,
      };
    },
  ),
  expectTest(
    'post-tool scaffold records pending companion obligations',
    'posttool-scaffold.py',
    () => createFixture(),
    writePayload,
    (root, run) => {
      const manifest = readJson<{ tasks?: Array<{ path?: string; status?: string; missing?: string[] }> }>(
        join(root, '.ai-starter/manifests/companions.json'),
        {},
      );
      const task = manifest.tasks?.find(item => item.path === 'components/HookProbe.tsx');
      return {
        pass: run.exitCode === 0 && task?.status === 'pending' && Boolean(task.missing?.includes('unit-test')),
        expected: 'pending companion task with missing unit-test/storybook/visual-check',
        actual: `exit=${run.exitCode}, task=${task ? JSON.stringify(task) : 'missing'}`,
      };
    },
  ),
  expectTest(
    'stop gate blocks active plans when scorecard is missing',
    'stop-check.py',
    () => createFixture({ activePlan: true, scorecard: 'missing' }),
    {},
    (_root, run) => ({
      pass: run.exitCode !== 0 && run.stderr.includes('Stop denied by AI Starter Autopilot') && run.stderr.includes('pnpm score'),
      expected: 'non-zero exit with autopilot scorecard continuation packet',
      actual: `exit=${run.exitCode}`,
    }),
  ),
  expectTest(
    'stop gate blocks required product validation before weak completion',
    'stop-check.py',
    () => createFixture({ activePlan: true, productValidation: 'required-missing' }),
    {},
    (_root, run) => ({
      pass: run.exitCode !== 0 && run.stderr.includes('product validation') && run.stderr.includes('pnpm product:validate'),
      expected: 'non-zero exit with product validation continuation packet',
      actual: `exit=${run.exitCode}`,
    }),
  ),
  expectTest(
    'stop gate blocks active plans when scorecard has blockers',
    'stop-check.py',
    () => createFixture({ activePlan: true, scorecard: 'blocked' }),
    {},
    (_root, run) => ({
      pass: run.exitCode !== 0 && run.stderr.includes('Stop denied by AI Starter Autopilot') && run.stderr.includes('scorecard'),
      expected: 'non-zero exit with autopilot scorecard blocker packet',
      actual: `exit=${run.exitCode}`,
    }),
  ),
  expectTest(
    'stop autopilot blocks clean plans with pending companions',
    'stop-check.py',
    () => createFixture({ activePlan: true, scorecard: 'clean', pendingCompanion: true }),
    {},
    (_root, run) => ({
      pass: run.exitCode !== 0 && run.stderr.includes('Pending companions') && run.stderr.includes('pnpm companions'),
      expected: 'non-zero exit with pending companion continuation packet',
      actual: `exit=${run.exitCode}, stderr=${run.stderr.slice(0, 240)}`,
    }),
  ),
  expectTest(
    'stop gate allows clean active plans with handoff evidence',
    'stop-check.py',
    () => createFixture({ activePlan: true, scorecard: 'clean', handoff: true }),
    {},
    (root, run) => {
      const events = telemetry(root);
      const allowed = events.some(event => event.hook === 'stop-check.py' && event.outcome === 'allowed');
      return {
        pass: run.exitCode === 0 && allowed,
        expected: 'zero exit and stop allowed telemetry',
        actual: `exit=${run.exitCode}, allowed=${allowed}`,
      };
    },
  ),
  expectTest(
    'stop gate allows sessions with no active plan',
    'stop-check.py',
    () => createFixture(),
    {},
    (root, run) => {
      const events = telemetry(root);
      const allowed = events.some(event => event.hook === 'stop-check.py' && event.outcome === 'allowed');
      return {
        pass: run.exitCode === 0 && allowed,
        expected: 'zero exit and no-active-plan allowed telemetry',
        actual: `exit=${run.exitCode}, allowed=${allowed}`,
      };
    },
  ),
];

const report: HookTestReport = {
  generatedAt: nowIso(),
  sourceHooksDir: findHooksDir(),
  total: tests.length,
  passed: tests.filter(test => test.pass).length,
  failed: tests.filter(test => !test.pass).length,
  results: tests,
};

const evidenceDir = resolve(cwd, '.evidence/hooks');
mkdirSync(evidenceDir, { recursive: true });
writeFileSync(join(evidenceDir, 'hook-test-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
writeFileSync(
  join(evidenceDir, 'hook-test-report.md'),
  [
    '# Hook Test Report',
    '',
    `Generated: ${report.generatedAt}`,
    `Source hooks: ${report.sourceHooksDir}`,
    `Result: ${report.passed}/${report.total} passed`,
    '',
    ...report.results.map(result =>
      `- ${result.pass ? 'PASS' : 'FAIL'} ${result.name}: ${result.actual}`,
    ),
    '',
  ].join('\n'),
  'utf-8',
);

if (existsSync(resolve(cwd, '.ai-starter-kit.json'))) {
  syncStarterSystem({ cwd });
}

if (!process.env.AI_STARTER_KEEP_HOOK_FIXTURES) {
  rmSync(fixtureRoot, { recursive: true, force: true });
}

console.log(`hook-tests=${report.passed}/${report.total}`);
console.log(`evidence=.evidence/hooks/hook-test-report.json`);

if (report.failed > 0) {
  for (const result of report.results.filter(item => !item.pass)) {
    console.error(`${result.name}: expected ${result.expected}, got ${result.actual}`);
    if (result.stderr) console.error(result.stderr);
  }
  process.exit(1);
}
