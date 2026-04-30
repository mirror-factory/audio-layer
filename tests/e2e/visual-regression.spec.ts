/**
 * Visual Regression Tests — Catches what unit tests can't see
 *
 * Captures screenshots at multiple breakpoints and compares against baselines.
 * Detects CSS regressions, layout breaks, and "looks wrong" issues automatically.
 *
 * First run: Generates baseline screenshots (committed to repo)
 * Subsequent runs: Compares against baselines, fails if diff > threshold
 *
 * Generate/update baselines:
 *   npx playwright test tests/e2e/visual-regression.spec.ts --update-snapshots
 *
 * Cost: Free (Playwright built-in, no external service)
 * Speed: ~30-60 seconds
 */

import { existsSync, mkdirSync } from 'fs';
import { dirname } from 'path';
import { test, expect, type Page, type TestInfo } from '@playwright/test';

// ── Configuration ─────────────────────────────────────────────────────

/**
 * CUSTOMIZE: Your app's key pages and breakpoints.
 */
const PAGES = [
  { path: '/', name: 'home' },
  // { path: '/dashboard', name: 'dashboard' },
  // { path: '/settings', name: 'settings' },
  // { path: '/brand', name: 'brand-studio' },
];

const BREAKPOINTS = [
  { name: 'mobile', width: 375, height: 812 },    // iPhone 13
  { name: 'tablet', width: 768, height: 1024 },    // iPad
  { name: 'desktop', width: 1440, height: 900 },   // Standard desktop
];

/** Maximum pixel difference ratio before test fails (1% = 0.01) */
const MAX_DIFF_RATIO = 0.01;

async function ensureBaseline(page: Page, testInfo: TestInfo, name: string): Promise<boolean> {
  const snapshotPath = testInfo.snapshotPath(name);
  if (existsSync(snapshotPath)) return false;

  mkdirSync(dirname(snapshotPath), { recursive: true });
  await page.screenshot({
    path: snapshotPath,
    animations: 'disabled',
  });
  testInfo.annotations.push({
    type: 'visual-baseline',
    description: `Created local visual baseline for ${name}`,
  });
  return true;
}

// ── Tests ─────────────────────────────────────────────────────────────

for (const bp of BREAKPOINTS) {
  test.describe(`Visual — ${bp.name} (${bp.width}x${bp.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: bp.width, height: bp.height });
    });

    for (const { path, name } of PAGES) {
      test(`${name} matches baseline`, async ({ page }, testInfo) => {
        await page.goto(path, { waitUntil: 'networkidle' });

        // Wait for animations to settle
        await page.waitForTimeout(500);

        // Hide dynamic content that changes between runs
        await page.evaluate(() => {
          // Hide timestamps, counters, and other dynamic content
          document.querySelectorAll('[data-visual-hide]').forEach(el => {
            (el as HTMLElement).style.visibility = 'hidden';
          });
        });

        const screenshotName = `${name}-${bp.name}.png`;
        if (await ensureBaseline(page, testInfo, screenshotName)) return;

        await expect(page).toHaveScreenshot(screenshotName, {
          maxDiffPixelRatio: MAX_DIFF_RATIO,
          // Animation-friendly: allow slight differences from transitions
          animations: 'disabled',
        });
      });
    }
  });
}

// ── Component-level visual tests (optional) ────────────────────────────
// Uncomment and customize for Storybook-like component screenshots

/*
const COMPONENTS = [
  { selector: '[data-testid="nav"]', name: 'navigation' },
  { selector: '[data-testid="chat-input"]', name: 'chat-input' },
  { selector: '[data-testid="tool-card"]', name: 'tool-card' },
];

test.describe('Component visual regression', () => {
  for (const { selector, name } of COMPONENTS) {
    test(`${name} matches baseline`, async ({ page }) => {
      await page.goto('/', { waitUntil: 'networkidle' });
      const element = page.locator(selector).first();
      if (await element.isVisible()) {
        await expect(element).toHaveScreenshot(`component-${name}.png`, {
          maxDiffPixelRatio: MAX_DIFF_RATIO,
        });
      }
    });
  }
});
*/
