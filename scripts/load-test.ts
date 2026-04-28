#!/usr/bin/env tsx
/**
 * Load testing script using autocannon.
 *
 * Simulates concurrent users against a running server and captures
 * p50/p90/p99 latency, throughput, status distribution and errors.
 *
 * Usage:
 *   pnpm test:load                       # run against http://localhost:3000
 *   LOAD_TEST_BASE_URL=... pnpm test:load # custom base URL
 *
 * IMPORTANT: Run against `next build && next start` for real benchmarks.
 * Dev mode yields pessimistic numbers.
 *
 * AI endpoints are NOT load-tested -- they cost tokens and are rate-limited.
 *
 * HOW TO CUSTOMIZE:
 * 1. Update BASE_URL default port for your project
 * 2. Update SCENARIOS with your app's routes
 * 3. Install: pnpm add -D autocannon @types/autocannon
 *
 * Copied from vercel-ai-starter-kit. Customize for your project.
 */

import autocannon, { type Result } from 'autocannon';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';

const BASE_URL = process.env.LOAD_TEST_BASE_URL ?? 'http://localhost:3000';
const CONCURRENCY = Number(process.env.LOAD_TEST_CONCURRENCY ?? 15);
const DURATION = Number(process.env.LOAD_TEST_DURATION ?? 10);

interface LoadTestScenario {
  name: string;
  path: string;
  method?: 'GET' | 'POST';
  body?: string;
  headers?: Record<string, string>;
}

// TODO: Update with your app's routes
const SCENARIOS: LoadTestScenario[] = [
  { name: 'landing', path: '/' },
  { name: 'api-health', path: '/api/health' },
  // TODO: Add your app's pages and API endpoints
  // { name: 'dashboard', path: '/dashboard' },
  // { name: 'api-data', path: '/api/data' },
];

interface ScenarioReport {
  scenario: string;
  url: string;
  latency: { p50: number; p90: number; p99: number; avg: number; max: number };
  throughput: { avg: number; total: number };
  requests: { total: number; per2xx: number; per3xx: number; per4xx: number; per5xx: number; errors: number; timeouts: number };
  errorRate: number;
}

interface ScenarioError {
  scenario: string;
  url: string;
  error: string;
}

type ScenarioOutcome = ScenarioReport | ScenarioError;

function isError(outcome: ScenarioOutcome): outcome is ScenarioError {
  return 'error' in outcome;
}

async function runScenario(scenario: LoadTestScenario): Promise<Result> {
  const url = `${BASE_URL}${scenario.path}`;
  console.log(`\n  Running: ${scenario.name.padEnd(16)} -> ${url}`);
  return autocannon({
    url, connections: CONCURRENCY, duration: DURATION,
    method: scenario.method ?? 'GET', body: scenario.body, headers: scenario.headers,
    maxConnectionRequests: 0,
  });
}

function formatMs(n: number | undefined): string {
  if (n === undefined || Number.isNaN(n)) return '  -  ';
  return `${Math.round(n)}ms`;
}

async function main(): Promise<void> {
  console.log(`\n  Load test -- ${CONCURRENCY} concurrent users, ${DURATION}s per scenario`);
  console.log(`  Base URL: ${BASE_URL}`);
  console.log(`  Scenarios: ${SCENARIOS.length}`);

  const outcomes: ScenarioOutcome[] = [];

  for (const scenario of SCENARIOS) {
    const url = `${BASE_URL}${scenario.path}`;
    try {
      const result = await runScenario(scenario);
      const total = result.requests.total || 0;
      const errors = (result.errors || 0) + (result.non2xx || 0);
      outcomes.push({
        scenario: scenario.name, url,
        latency: { p50: result.latency.p50, p90: result.latency.p90, p99: result.latency.p99, avg: result.latency.average, max: result.latency.max },
        throughput: { avg: result.throughput.average, total: result.throughput.total },
        requests: { total, per2xx: result['2xx'] ?? 0, per3xx: result['3xx'] ?? 0, per4xx: result['4xx'] ?? 0, per5xx: result['5xx'] ?? 0, errors: result.errors ?? 0, timeouts: result.timeouts ?? 0 },
        errorRate: total > 0 ? errors / total : 0,
      });
    } catch (err) {
      outcomes.push({ scenario: scenario.name, url, error: (err as Error).message });
    }
  }

  const memory = process.memoryUsage();
  const memorySummary = {
    rssMB: +(memory.rss / 1024 / 1024).toFixed(1),
    heapUsedMB: +(memory.heapUsed / 1024 / 1024).toFixed(1),
    heapTotalMB: +(memory.heapTotal / 1024 / 1024).toFixed(1),
    externalMB: +(memory.external / 1024 / 1024).toFixed(1),
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const outputDir = join(process.cwd(), '.evidence', 'load-tests');
  mkdirSync(outputDir, { recursive: true });

  const payload = {
    timestamp: new Date().toISOString(),
    baseUrl: BASE_URL, concurrency: CONCURRENCY, durationSec: DURATION,
    memory: memorySummary, results: outcomes,
  };

  writeFileSync(join(outputDir, `${timestamp}.json`), JSON.stringify(payload, null, 2));
  writeFileSync(join(outputDir, 'latest.json'), JSON.stringify(payload, null, 2));

  console.log('\n  Results:');
  console.log('  ' + 'Scenario'.padEnd(18) + 'p50'.padEnd(10) + 'p90'.padEnd(10) + 'p99'.padEnd(10) + '2xx'.padEnd(8) + 'errors'.padEnd(8) + 'err%');
  console.log('  ' + '-'.repeat(70));

  for (const outcome of outcomes) {
    if (isError(outcome)) { console.log(`  ${outcome.scenario.padEnd(17)} ERROR: ${outcome.error}`); continue; }
    console.log('  ' + outcome.scenario.padEnd(18) + formatMs(outcome.latency.p50).padEnd(10) + formatMs(outcome.latency.p90).padEnd(10) + formatMs(outcome.latency.p99).padEnd(10) + String(outcome.requests.per2xx).padEnd(8) + String(outcome.requests.errors + outcome.requests.per5xx).padEnd(8) + (outcome.errorRate * 100).toFixed(1) + '%');
  }
  console.log(`\n  Saved: .evidence/load-tests/latest.json\n`);

  if (outcomes.filter(isError).length > 0) process.exitCode = 1;
}

main().catch((err) => { console.error('Load test failed:', err); process.exit(1); });
