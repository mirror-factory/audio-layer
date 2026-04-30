import { execSync } from 'child_process';
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} from 'fs';
import { createRequire } from 'module';
import { dirname, resolve } from 'path';
import type { Browser } from '@playwright/test';
import {
  FEATURE_MANIFEST_FILE,
  generateScorecard,
  syncStarterSystem,
  type SurfaceManifestEntry,
} from './ai-starter-core.js';

const requireFromProject = createRequire(resolve(process.cwd(), 'package.json'));
const { chromium, expect } = requireFromProject('@playwright/test') as typeof import('@playwright/test');

interface RouteProof {
  name: string;
  sourcePath: string;
  url: string;
  status: number | null;
  screenshotPath: string;
  consoleErrors: string[];
  failedRequests: string[];
  bodyCharacters: number;
}

interface CommandResult {
  command: string;
  ok: boolean;
  output: string;
}

interface BrowserUsageEvent {
  id: string;
  timestamp: string;
  integrationId: string;
  label: string;
  quantity: number;
  unit: string;
  unitCostUsd: number | null;
  costUsd: number;
  status: 'success' | 'error' | 'skipped';
  route: string | null;
  operation: string | null;
  error: string | null;
  url: string | null;
  metadata: Record<string, string | number | boolean | null>;
}

function slugify(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'route';
}

function readJson<T>(relPath: string, fallback: T): T {
  try {
    const full = resolve(process.cwd(), relPath);
    if (!existsSync(full)) return fallback;
    return JSON.parse(readFileSync(full, 'utf-8')) as T;
  } catch {
    return fallback;
  }
}

function routeUrlFromSource(sourcePath: string): string {
  let route = sourcePath
    .replace(/^app\/?/, '')
    .replace(/\/page\.[^.]+$/, '')
    .replace(/^page\.[^.]+$/, '')
    .replace(/\([^/]+\)\//g, '')
    .replace(/\/index$/, '');
  route = route.replace(/\/+/g, '/').replace(/^\/|\/$/g, '');
  return route ? `/${route}` : '/';
}

function compactOutput(output: string): string {
  const trimmed = output.trim();
  const limit = 2_400;
  if (trimmed.length <= limit) return trimmed;
  return `${trimmed.slice(0, limit)}\n...[truncated ${trimmed.length - limit} chars]`;
}

function numberEnv(name: string): number | null {
  const raw = process.env[name];
  if (!raw) return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function appendBrowserUsageEvent(input: {
  quantity: number;
  status: BrowserUsageEvent['status'];
  routeCount: number;
  screenshotCount: number;
  replayPath: string;
  error: string | null;
}): void {
  const unitCostUsd = numberEnv('AI_STARTER_EXPECT_BROWSER_COMMAND_COST_USD');
  const explicitCostUsd = numberEnv('AI_STARTER_EXPECT_BROWSER_COST_USD');
  const costUsd = explicitCostUsd ?? (unitCostUsd === null ? 0 : unitCostUsd * input.quantity);
  const event: BrowserUsageEvent = {
    id: `iu-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    integrationId: 'expect-browser',
    label: 'Expect Browser CLI',
    quantity: input.quantity,
    unit: 'command',
    unitCostUsd,
    costUsd,
    status: input.status,
    route: null,
    operation: 'browser-proof',
    error: input.error,
    url: null,
    metadata: {
      routeCount: input.routeCount,
      screenshotCount: input.screenshotCount,
      replayPath: input.replayPath,
    },
  };
  const logPath = resolve(process.cwd(), '.ai-starter/runs/integration-usage.jsonl');
  mkdirSync(dirname(logPath), { recursive: true });
  appendFileSync(logPath, `${JSON.stringify(event)}\n`, 'utf-8');
}

async function proveRoute(browser: Browser, baseUrl: string, route: SurfaceManifestEntry): Promise<RouteProof> {
  const page = await browser.newPage({ viewport: { width: 1440, height: 960 } });
  const consoleErrors: string[] = [];
  const failedRequests: string[] = [];
  page.on('console', message => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('requestfailed', request => {
    failedRequests.push(`${request.method()} ${request.url()} ${request.failure()?.errorText ?? ''}`.trim());
  });

  const routePath = routeUrlFromSource(route.sourcePaths[0] ?? route.name);
  const url = new URL(routePath, baseUrl).toString();
  const screenshotPath = `.evidence/screenshots/${slugify(route.sourcePaths[0] ?? route.name)}.png`;
  mkdirSync(dirname(resolve(process.cwd(), screenshotPath)), { recursive: true });

  const response = await page.goto(url, { waitUntil: 'load', timeout: 30_000 });
  await page.waitForLoadState('networkidle', { timeout: 10_000 }).catch(() => undefined);
  await expect(page.locator('body')).not.toBeEmpty();
  const bodyCharacters = (await page.locator('body').innerText()).trim().length;
  await page.screenshot({ path: screenshotPath, fullPage: true });
  await page.close();

  return {
    name: route.name,
    sourcePath: route.sourcePaths[0] ?? route.name,
    url,
    status: response?.status() ?? null,
    screenshotPath,
    consoleErrors,
    failedRequests,
    bodyCharacters,
  };
}

function runExpectCommand(command: string): CommandResult {
  try {
    const output = execSync(command, {
      cwd: process.cwd(),
      encoding: 'utf-8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 90_000,
    });
    return { command, ok: true, output: compactOutput(output) };
  } catch (error) {
    const typed = error as { stdout?: string; stderr?: string };
    return {
      command,
      ok: false,
      output: compactOutput(`${typed.stdout ?? ''}\n${typed.stderr ?? ''}`),
    };
  }
}

function copyArtifact(source: string, target: string): string | null {
  if (!existsSync(source)) return null;
  mkdirSync(dirname(resolve(process.cwd(), target)), { recursive: true });
  copyFileSync(source, resolve(process.cwd(), target));
  return target;
}

function runExpectProbe(baseUrl: string, routePath: string): { commands: CommandResult[]; copiedScreenshotPath: string | null; copiedVideoPath: string | null } {
  const url = new URL(routePath, baseUrl).toString();
  const commands: CommandResult[] = [];
  const run = (command: string) => {
    const result = runExpectCommand(command);
    commands.push(result);
    return result;
  };

  const open = run(`pnpm exec expect open --browser chromium --wait-until load ${JSON.stringify(url)}`);
  if (!open.ok) return { commands, copiedScreenshotPath: null, copiedVideoPath: null };

  let copiedScreenshotPath: string | null = null;
  let copiedVideoPath: string | null = null;
  try {
    let screenshot = run('pnpm exec expect screenshot --full-page');
    if (!screenshot.ok) {
      screenshot = run('pnpm exec expect screenshot --full-page');
    }
    const source = screenshot.output.match(/Screenshot saved:\s*(.+)$/m)?.[1]?.trim();
    if (source) {
      copiedScreenshotPath = copyArtifact(source, `.evidence/screenshots/expect-${slugify(routePath)}.png`);
    }
    run('pnpm exec expect console_logs --type error');
    run('pnpm exec expect network_requests');
    run('pnpm exec expect performance_metrics');
  } finally {
    const close = run('pnpm exec expect close');
    const videoSource = close.output.match(/Playwright video:\s*(.+)$/m)?.[1]?.trim();
    if (videoSource) {
      copiedVideoPath = copyArtifact(videoSource, `.evidence/videos/expect-${slugify(routePath)}.webm`);
    }
  }

  return { commands, copiedScreenshotPath, copiedVideoPath };
}

async function main() {
  const cwd = process.cwd();
  const baseUrl = process.env.AI_STARTER_BASE_URL ?? process.env.PLAYWRIGHT_BASE_URL ?? 'http://localhost:3000';
  syncStarterSystem({ cwd });
  const features = readJson<SurfaceManifestEntry[]>(FEATURE_MANIFEST_FILE, []);
  const routes = features.filter(feature => {
    const sourcePath = feature.sourcePaths[0] ?? '';
    return feature.kind === 'route' &&
      /\/page\.[tj]sx?$/.test(sourcePath) &&
      !sourcePath.includes('[');
  });
  if (routes.length === 0) {
    throw new Error('No route surfaces found in feature manifest. Run `pnpm sync` first.');
  }

  const browser = await chromium.launch({ headless: true });
  const routeProofs: RouteProof[] = [];
  try {
    for (const route of routes) {
      routeProofs.push(await proveRoute(browser, baseUrl, route));
    }
  } finally {
    await browser.close();
  }

  const expectRouteLimit = Number(process.env.AI_STARTER_EXPECT_ROUTE_LIMIT ?? '1');
  const expectRoutes = routes.slice(0, Number.isFinite(expectRouteLimit) ? Math.max(1, expectRouteLimit) : 1);
  const expectProbes = expectRoutes.map(route => {
    const sourcePath = route.sourcePaths[0] ?? route.name;
    const routePath = routeUrlFromSource(sourcePath);
    return {
      route: sourcePath,
      routePath,
      ...runExpectProbe(baseUrl, routePath),
    };
  });
  const runId = new Date().toISOString().replace(/[:.]/g, '-');
  const replayPath = `.expect/replays/browser-proof-${runId}.json`;
  const reportPath = `.evidence/browser-proof/${runId}.json`;
  const firstExpectProbe = expectProbes[0] ?? null;
  const replay = {
    id: `browser-proof-${runId}`,
    createdAt: new Date().toISOString(),
    baseUrl,
    routes: routeProofs,
    expectCli: {
      required: true,
      route: firstExpectProbe?.route ?? null,
      copiedScreenshotPath: firstExpectProbe?.copiedScreenshotPath ?? null,
      copiedVideoPath: firstExpectProbe?.copiedVideoPath ?? null,
      commands: expectProbes.flatMap(probe => probe.commands),
      probes: expectProbes,
    },
  };
  mkdirSync(dirname(resolve(cwd, replayPath)), { recursive: true });
  mkdirSync(dirname(resolve(cwd, reportPath)), { recursive: true });
  writeFileSync(resolve(cwd, replayPath), JSON.stringify(replay, null, 2) + '\n', 'utf-8');
  writeFileSync(resolve(cwd, reportPath), JSON.stringify(replay, null, 2) + '\n', 'utf-8');

  const failingRoutes = routeProofs.filter(route =>
    (route.status !== null && route.status >= 400) ||
    route.bodyCharacters === 0 ||
    route.failedRequests.length > 0,
  );
  const failedExpectCommands = expectProbes.flatMap(probe =>
    probe.commands
      .filter(command => {
        if (command.ok) return false;
        if (command.command.includes('expect screenshot')) return false;
        return true;
      })
      .map(command => ({ route: probe.route, ...command })),
  );
  appendBrowserUsageEvent({
    quantity: expectProbes.flatMap(probe => probe.commands).length,
    status: failedExpectCommands.length > 0 ? 'error' : 'success',
    routeCount: routeProofs.length,
    screenshotCount: routeProofs.length + expectProbes.filter(probe => probe.copiedScreenshotPath).length,
    replayPath,
    error: failedExpectCommands[0]?.output ?? null,
  });
  syncStarterSystem({ cwd });
  const scorecard = generateScorecard({ cwd });

  console.log(`browser-proof routes=${routeProofs.length}`);
  console.log(`screenshots=${routeProofs.length + expectProbes.filter(probe => probe.copiedScreenshotPath).length}`);
  console.log(`replay=${replayPath}`);
  console.log(`score=${scorecard.score}/100`);

  if (failingRoutes.length > 0 || failedExpectCommands.length > 0) {
    console.error(JSON.stringify({ failingRoutes, failedExpectCommands }, null, 2));
    process.exitCode = 1;
  }
}

main().catch(error => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
