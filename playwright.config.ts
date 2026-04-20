/**
 * Playwright config with the 6-project viewport/theme matrix the kit's
 * observability-requirements.yaml enforces for UI coverage.
 *
 * Viewports:      mobile | tablet | desktop
 * Themes:         light  | dark
 * Total projects: 6  (mobile-light, mobile-dark, tablet-light, tablet-dark,
 *                     desktop-light, desktop-dark)
 *
 * Every component in components.yaml and every page in pages.yaml must pass
 * on all 6 projects. Video always records. Traces retained on failure.
 * Visual baselines live in tests/visual/__screenshots__/.
 *
 * Run:
 *   pnpm exec playwright test                                  # all projects
 *   pnpm exec playwright test --project mobile-dark            # one project
 *   VISUAL_UPDATE=1 pnpm exec playwright test tests/visual     # update baselines
 *   TEST_BASE_URL=http://localhost:3999 pnpm exec playwright test
 */

import { defineConfig, devices } from '@playwright/test';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const baseURL = process.env.TEST_BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000';

// Inherit run_id so test-results JSON can be joined with the dashboard's
// /dev-kit/runs/[run_id] aggregate. Order: explicit env > state file > none.
function resolveRunId(): string | null {
  if (process.env.RUN_ID) return process.env.RUN_ID;
  const statePath = join(process.cwd(), '.ai-dev-kit', 'state', 'current-run.json');
  if (!existsSync(statePath)) return null;
  try { return JSON.parse(readFileSync(statePath, 'utf-8')).run_id ?? null; } catch { return null; }
}
const runId = resolveRunId();
if (runId) process.env.RUN_ID = runId;

function theme(mode: 'light' | 'dark') {
  return {
    colorScheme: mode,
    // Storage hook so the app can read localStorage.theme / cookie on boot.
    // Projects with a different theme mechanism should extend `use` here.
    contextOptions: { colorScheme: mode } as Record<string, unknown>,
  };
}

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI
    ? [
        ['html', { open: 'never' }],
        ['json', { outputFile: `test-results/playwright-${runId ?? 'no-run'}.json` }],
      ]
    : [
        ['html'],
        ['json', { outputFile: `test-results/playwright-${runId ?? 'no-run'}.json` }],
      ],

  use: {
    baseURL,
    trace: 'retain-on-failure',
    video: 'on',
    screenshot: 'only-on-failure',
  },

  expect: {
    // Visual regression defaults; per-test overrides allowed.
    toHaveScreenshot: { maxDiffPixelRatio: 0.01, animations: 'disabled' },
    toMatchSnapshot:  { maxDiffPixelRatio: 0.01 },
  },

  projects: [
    // mobile
    { name: 'mobile-light',  use: { ...devices['iPhone 14'],                 ...theme('light') } },
    { name: 'mobile-dark',   use: { ...devices['iPhone 14'],                 ...theme('dark')  } },
    // tablet
    { name: 'tablet-light',  use: { ...devices['iPad (gen 11)'],             ...theme('light') } },
    { name: 'tablet-dark',   use: { ...devices['iPad (gen 11)'],             ...theme('dark')  } },
    // desktop
    { name: 'desktop-light', use: { ...devices['Desktop Chrome'],            ...theme('light') } },
    { name: 'desktop-dark',  use: { ...devices['Desktop Chrome'],            ...theme('dark')  } },
  ],

  webServer: process.env.TEST_BASE_URL ? undefined : {
    command: 'pnpm dev',
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
