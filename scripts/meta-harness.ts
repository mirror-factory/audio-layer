import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { dirname, join, resolve } from 'path';
import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';

interface CommandRecord {
  name: string;
  command: string[];
  cwd: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
}

interface MetaHarnessReport {
  generatedAt: string;
  kitRoot: string;
  fixtureRoot: string;
  passed: boolean;
  commands: CommandRecord[];
  assertions: Array<{ name: string; pass: boolean; details: string }>;
}

const cwd = process.cwd();
const scriptDir = dirname(fileURLToPath(import.meta.url));
const inferredKitRoot = resolve(scriptDir, '..');
const kitRoot = resolve(process.env.AI_STARTER_KIT_DIR ?? inferredKitRoot);
const fixtureRoot = mkdtempSync(join(tmpdir(), 'ai-starter-meta-'));

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

function findTsxBin(): string {
  const candidates = [
    resolve(kitRoot, 'node_modules/.bin/tsx'),
    resolve(cwd, 'node_modules/.bin/tsx'),
  ];
  const found = candidates.find(existsSync);
  if (!found) {
    throw new Error('Could not find tsx. Run pnpm install in the kit or reference app first.');
  }
  return found;
}

const tsxBin = findTsxBin();

function runCommand(name: string, command: string[], commandCwd: string, env: Record<string, string> = {}): CommandRecord {
  const startedAt = Date.now();
  const result = spawnSync(command[0]!, command.slice(1), {
    cwd: commandCwd,
    encoding: 'utf-8',
    env: {
      ...process.env,
      ...env,
    },
  });
  return {
    name,
    command,
    cwd: commandCwd,
    exitCode: result.status ?? 1,
    stdout: result.stdout ?? '',
    stderr: result.stderr ?? '',
    durationMs: Date.now() - startedAt,
  };
}

function fixturePath(...parts: string[]): string {
  return join(fixtureRoot, ...parts);
}

function relativeFixture(path: string): string {
  return path.replace(`${fixtureRoot}/`, '');
}

function seedFixtureApp(): void {
  mkdirSync(fixturePath('app'), { recursive: true });
  mkdirSync(fixturePath('components'), { recursive: true });
  mkdirSync(fixturePath('lib/ai'), { recursive: true });
  writeJson(fixturePath('package.json'), {
    name: 'ai-starter-meta-fixture',
    version: '0.0.0',
    private: true,
    type: 'module',
    scripts: {},
    dependencies: {
      '@ai-sdk/gateway': '^3.0.0',
      ai: '^6.0.0',
      next: '^15.3.0',
      react: '^19.0.0',
      'react-dom': '^19.0.0',
    },
    devDependencies: {},
  });
  writeFileSync(fixturePath('tsconfig.json'), JSON.stringify({
    compilerOptions: {
      target: 'ES2022',
      module: 'ESNext',
      moduleResolution: 'Bundler',
      jsx: 'preserve',
      strict: true,
      skipLibCheck: true,
      noEmit: true,
    },
  }, null, 2) + '\n', 'utf-8');
  writeFileSync(fixturePath('app/page.tsx'), 'export default function Page() { return <main>Meta harness fixture</main>; }\n', 'utf-8');
  writeFileSync(fixturePath('components/FixtureCard.tsx'), 'export function FixtureCard() { return <section>Fixture</section>; }\n', 'utf-8');
  writeFileSync(
    fixturePath('lib/ai/tool-meta.ts'),
    `export const TOOL_META = {
  askQuestion: {
    label: "Ask Question",
    description: "Fixture tool",
    type: "server",
    ui: "silent",
    category: "search"
  }
};
`,
    'utf-8',
  );
}

function assertFile(path: string): { name: string; pass: boolean; details: string } {
  return {
    name: `file:${relativeFixture(path)}`,
    pass: existsSync(path),
    details: existsSync(path) ? 'present' : 'missing',
  };
}

function assertScript(name: string): { name: string; pass: boolean; details: string } {
  const pkg = readJson<{ scripts?: Record<string, string> }>(fixturePath('package.json'), {});
  const script = pkg.scripts?.[name];
  return {
    name: `script:${name}`,
    pass: Boolean(script),
    details: script ?? 'missing',
  };
}

function commandPassed(commands: CommandRecord[], name: string): { name: string; pass: boolean; details: string } {
  const command = commands.find(item => item.name === name);
  return {
    name: `command:${name}`,
    pass: command?.exitCode === 0,
    details: command ? `exit=${command.exitCode}` : 'not run',
  };
}

function main(): void {
  if (!existsSync(resolve(kitRoot, 'bin/cli.ts'))) {
    throw new Error(`Meta harness requires kit source with bin/cli.ts. Set AI_STARTER_KIT_DIR. Current: ${kitRoot}`);
  }

  seedFixtureApp();

  const commands: CommandRecord[] = [];
  const cliPath = resolve(kitRoot, 'bin/cli.ts');
  const runCli = (name: string, args: string[], env: Record<string, string> = {}) => {
    const record = runCommand(name, [tsxBin, cliPath, ...args], fixtureRoot, {
      AI_STARTER_SKIP_INSTALL: '1',
      AI_STARTER_SKIP_GATES: '1',
      AI_STARTER_DOCTOR_SKIP_GATES: '1',
      ...env,
    });
    commands.push(record);
    return record;
  };
  const runFixtureScript = (
    name: string,
    relPath: string,
    args: string[] = [],
    env: Record<string, string> = {},
  ) => {
    const record = runCommand(name, [tsxBin, resolve(fixtureRoot, relPath), ...args], fixtureRoot, {
      AI_STARTER_DOCTOR_SKIP_GATES: '1',
      AI_STARTER_SKIP_GATES: '1',
      ...env,
    });
    commands.push(record);
    return record;
  };

  runCli('init:first', ['init']);
  runCli('init:second-idempotent', ['init']);
  runCli('setup:defaults', [
    'setup',
    '--yes',
    '--integration=supabase,assemblyai',
    '--design=Meta harness black and white pixel command center',
  ]);
  runFixtureScript('sync', 'scripts/sync-starter.ts');
  runFixtureScript('plan', 'scripts/plan-task.ts', ['Meta harness fixture feature']);
  runFixtureScript('companions', 'scripts/generate-companions.ts');
  runFixtureScript('hook-tests', 'scripts/hook-tester.ts');
  runFixtureScript('claude-runtime-proof', 'scripts/claude-runtime-proof.ts');
  runFixtureScript('claude-scenarios', 'scripts/claude-scenario-harness.ts');
  runFixtureScript('codex-runtime-proof', 'scripts/codex-runtime-proof.ts');
  runFixtureScript('sync:after-runtime-proof', 'scripts/sync-starter.ts');
  runFixtureScript('score', 'scripts/score-starter.ts');
  writeFileSync(
    fixturePath('components/IterateMutationCard.tsx'),
    'export function IterateMutationCard() { return <section>Iterate mutation target</section>; }\n',
    'utf-8',
  );
  runFixtureScript('sync:pre-iterate-mutation', 'scripts/sync-starter.ts');
  runFixtureScript('iterate-mutation', 'scripts/iterate-run.ts', [], {
    AI_STARTER_ITERATE_COMMANDS: `${tsxBin} scripts/score-starter.ts`,
    AI_STARTER_ITERATE_SKIP_GATES: '1',
    AI_STARTER_ITERATE_ALLOW_BLOCKED: '1',
  });
  runFixtureScript('usage-record', 'scripts/record-integration-usage.ts', [
    '--integration=custom-api-routes',
    '--quantity=2',
    '--unit=request',
    '--cost=0.01',
    '--operation=meta-harness-smoke',
  ]);
  runCli('doctor', ['doctor']);

  const starterManifest = readJson<{ enabledModules?: string[] }>(
    fixturePath('.ai-starter/manifests/starter.json'),
    {},
  );
  const setupManifest = readJson<{
    status?: string;
    requiredGroups?: number;
    missingGroups?: unknown[];
    configuredIntegrations?: string[];
  }>(
    fixturePath('.ai-starter/manifests/setup.json'),
    {},
  );
  const companionManifest = readJson<{ tasks?: unknown[] }>(
    fixturePath('.ai-starter/manifests/companions.json'),
    {},
  );
  const integrationManifest = readJson<unknown[]>(
    fixturePath('.ai-starter/manifests/integrations.json'),
    [],
  );
  const runtimeManifest = readJson<Array<{ id?: string; status?: string; hookCount?: number; proof?: { lastPass?: boolean | null } }>>(
    fixturePath('.ai-starter/manifests/runtimes.json'),
    [],
  );
  const latestIteration = readJson<{
    selectedImprovement?: { id?: string; mode?: string };
    mutation?: { applied?: boolean; changedFiles?: string[]; consideredTasks?: string[] };
    visualComparison?: { compared?: number; changed?: number; added?: number; removed?: number };
  }>(
    fixturePath('.ai-starter/runs/latest-iteration.json'),
    {},
  );

  const assertions = [
    commandPassed(commands, 'init:first'),
    commandPassed(commands, 'init:second-idempotent'),
    commandPassed(commands, 'setup:defaults'),
    commandPassed(commands, 'sync'),
    commandPassed(commands, 'plan'),
    commandPassed(commands, 'companions'),
    commandPassed(commands, 'hook-tests'),
    commandPassed(commands, 'claude-runtime-proof'),
    commandPassed(commands, 'claude-scenarios'),
    commandPassed(commands, 'codex-runtime-proof'),
    commandPassed(commands, 'sync:after-runtime-proof'),
    commandPassed(commands, 'score'),
    commandPassed(commands, 'sync:pre-iterate-mutation'),
    commandPassed(commands, 'iterate-mutation'),
    commandPassed(commands, 'usage-record'),
    commandPassed(commands, 'doctor'),
    assertFile(fixturePath('.ai-starter-kit.json')),
    assertFile(fixturePath('.ai-starter/config.json')),
    assertFile(fixturePath('.ai-starter/manifests/setup.json')),
    assertFile(fixturePath('.ai-starter/manifests/runtimes.json')),
    assertFile(fixturePath('.env.example')),
    assertFile(fixturePath('.claude/settings.json')),
    assertFile(fixturePath('.claude/hooks/pretool-plan-gate.py')),
    assertFile(fixturePath('.codex/config.toml')),
    assertFile(fixturePath('.codex/hooks.json')),
    assertFile(fixturePath('.codex/hooks/pretool-plan-gate.py')),
    assertFile(fixturePath('.codex/hooks/user-prompt-submit.py')),
    assertFile(fixturePath('docs/reference/openai-codex-runtime.md')),
    assertFile(fixturePath('scripts/hook-tester.ts')),
    assertFile(fixturePath('scripts/setup-starter.ts')),
    assertFile(fixturePath('scripts/browser-proof.ts')),
    assertFile(fixturePath('scripts/claude-runtime-proof.ts')),
    assertFile(fixturePath('scripts/claude-scenario-harness.ts')),
    assertFile(fixturePath('scripts/codex-runtime-proof.ts')),
    assertFile(fixturePath('scripts/record-integration-usage.ts')),
    assertFile(fixturePath('lib/starter-control-plane.ts')),
    assertFile(fixturePath('lib/integration-usage.ts')),
    assertFile(fixturePath('app/control-plane/page.tsx')),
    assertFile(fixturePath('app/api/control-plane/route.ts')),
    assertFile(fixturePath('.ai-starter/manifests/starter.json')),
    assertFile(fixturePath('.ai-starter/manifests/integrations.json')),
    assertFile(fixturePath('.ai-starter/runs/integration-usage.jsonl')),
    assertFile(fixturePath('.evidence/claude-runtime/report.json')),
    assertFile(fixturePath('.evidence/claude-scenarios/claude-scenario-report.json')),
    assertFile(fixturePath('.evidence/codex-runtime/report.json')),
    assertFile(fixturePath('.ai-starter/runs/latest-visual-diff.json')),
    assertFile(fixturePath('components/IterateMutationCard.test.tsx')),
    assertFile(fixturePath('components/IterateMutationCard.stories.tsx')),
    assertScript('starter:setup'),
    assertScript('starter:doctor'),
    assertScript('starter:update'),
    assertScript('starter:repair'),
    assertScript('sync'),
    assertScript('plan'),
    assertScript('score'),
    assertScript('usage:record'),
    assertScript('companions'),
    assertScript('browser:proof'),
    assertScript('test:claude-runtime'),
    assertScript('test:claude-scenarios'),
    assertScript('test:codex-runtime'),
    assertScript('test:hooks'),
    assertScript('storybook:build'),
    assertScript('test:stories'),
    {
      name: 'manifest:enabled-modules',
      pass: Boolean(starterManifest.enabledModules?.includes('setup') && starterManifest.enabledModules?.includes('hooks') && starterManifest.enabledModules?.includes('browser-proof')),
      details: `${starterManifest.enabledModules?.length ?? 0} enabled module(s)`,
    },
    {
      name: 'setup:configured-integrations',
      pass: Boolean(
        setupManifest.configuredIntegrations?.includes('supabase') &&
        setupManifest.configuredIntegrations?.includes('assemblyai'),
      ),
      details: JSON.stringify(setupManifest),
    },
    {
      name: 'setup:env-contract-detected',
      pass: setupManifest.status === 'needs-env' && (setupManifest.requiredGroups ?? 0) > 0,
      details: JSON.stringify(setupManifest),
    },
    {
      name: 'companions:generated',
      pass: Boolean(companionManifest.tasks && companionManifest.tasks.length > 0),
      details: `${companionManifest.tasks?.length ?? 0} companion task(s)`,
    },
    {
      name: 'integrations:generated',
      pass: integrationManifest.length > 0,
      details: `${integrationManifest.length} integration(s)`,
    },
    {
      name: 'runtimes:codex-and-claude-configured',
      pass: ['codex', 'claude-code'].every(id =>
        runtimeManifest.some(runtime => runtime.id === id && runtime.status === 'configured' && (runtime.hookCount ?? 0) > 0),
      ),
      details: JSON.stringify(runtimeManifest.map(runtime => `${runtime.id}:${runtime.status}:${runtime.hookCount}`)),
    },
    {
      name: 'runtimes:codex-proof-recorded',
      pass: runtimeManifest.some(runtime => runtime.id === 'codex' && runtime.proof?.lastPass === true),
      details: JSON.stringify(runtimeManifest.find(runtime => runtime.id === 'codex') ?? {}),
    },
    {
      name: 'iterate:mutation-applied',
      pass: latestIteration.selectedImprovement?.id === 'satisfy-companion-obligations' &&
        latestIteration.selectedImprovement?.mode === 'applied' &&
        Boolean(latestIteration.mutation?.applied) &&
        Boolean(latestIteration.mutation?.changedFiles?.includes('components/IterateMutationCard.test.tsx')),
      details: JSON.stringify(latestIteration.mutation ?? {}),
    },
    {
      name: 'iterate:visual-comparison-recorded',
      pass: Boolean(latestIteration.visualComparison),
      details: JSON.stringify(latestIteration.visualComparison ?? {}),
    },
  ];

  const report: MetaHarnessReport = {
    generatedAt: nowIso(),
    kitRoot,
    fixtureRoot,
    passed: assertions.every(assertion => assertion.pass),
    commands,
    assertions,
  };

  const evidenceDir = resolve(cwd, '.evidence/meta-harness');
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(join(evidenceDir, 'meta-harness-report.json'), JSON.stringify(report, null, 2) + '\n', 'utf-8');
  writeFileSync(
    join(evidenceDir, 'meta-harness-report.md'),
    [
      '# Meta Harness Report',
      '',
      `Generated: ${report.generatedAt}`,
      `Kit root: ${report.kitRoot}`,
      `Fixture: ${report.fixtureRoot}`,
      `Result: ${report.passed ? 'PASS' : 'FAIL'}`,
      '',
      '## Commands',
      '',
      ...commands.map(command => `- ${command.exitCode === 0 ? 'PASS' : 'FAIL'} ${command.name}: exit=${command.exitCode}, ${command.durationMs}ms`),
      '',
      '## Assertions',
      '',
      ...assertions.map(assertion => `- ${assertion.pass ? 'PASS' : 'FAIL'} ${assertion.name}: ${assertion.details}`),
      '',
    ].join('\n'),
    'utf-8',
  );

  console.log(`meta-harness=${report.passed ? 'pass' : 'fail'}`);
  console.log(`fixture=${fixtureRoot}`);
  console.log('evidence=.evidence/meta-harness/meta-harness-report.json');

  if (report.passed && process.env.AI_STARTER_KEEP_META_FIXTURE !== '1') {
    rmSync(fixtureRoot, { recursive: true, force: true });
  }

  if (!report.passed) {
    console.error('Meta harness failed. Fixture was kept for inspection.');
    for (const command of commands.filter(item => item.exitCode !== 0)) {
      console.error(`${command.name}: exit=${command.exitCode}`);
      console.error((command.stderr || command.stdout).split('\n').slice(-20).join('\n'));
    }
    process.exit(1);
  }
}

try {
  main();
} catch (error) {
  const evidenceDir = resolve(cwd, '.evidence/meta-harness');
  mkdirSync(evidenceDir, { recursive: true });
  writeFileSync(
    join(evidenceDir, 'meta-harness-error.log'),
    error instanceof Error ? `${error.stack ?? error.message}\n` : `${String(error)}\n`,
    'utf-8',
  );
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
}
