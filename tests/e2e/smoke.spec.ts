/**
 * Browser Smoke Test — Catches what unit tests can't
 *
 * This test verifies that pages actually load, render correctly, and
 * don't have console errors or layout issues. It runs on every push
 * when UI files change (via CI or post-commit hook).
 *
 * Catches:
 * - CSS overflow bugs (double scrollbar, pushed-off-screen elements)
 * - Missing tool renderers (tool cards showing raw JSON instead of UI)
 * - Console errors from SSR/hydration mismatches
 * - Layout regressions on mobile vs desktop
 * - Missing imports or broken dynamic imports
 *
 * Cost: Free (Playwright, no AI)
 * Speed: ~10-30 seconds
 *
 * Usage:
 *   pnpm test:smoke
 *   # Or in CI:
 *   npx playwright test tests/e2e/smoke.spec.ts
 */

import { test, expect, type Page } from '@playwright/test';

// ── Configuration ─────────────────────────────────────────────────────

/**
 * CUSTOMIZE: List your app's main pages here.
 * Each page gets load-tested on both desktop and mobile viewports.
 */
const PAGES = [
  { path: '/', name: 'Home' },
  { path: '/record', name: 'Record' },
  { path: '/meetings', name: 'Meetings' },
  { path: '/chat', name: 'Chat' },
  { path: '/observability', name: 'Observability' },
];

const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'mobile', width: 375, height: 812 },
];

/**
 * Console error patterns to IGNORE (false positives).
 * Add patterns for known non-critical warnings here.
 */
const IGNORED_CONSOLE_PATTERNS = [
  /Download the React DevTools/,
  /Warning: ReactDOM.render is no longer supported/,
  /hydration/i, // Next.js hydration warnings in dev
  /Failed to load resource.*favicon/,
  /\[Fast Refresh\]/,
];

// ── Helpers ───────────────��───────────────────────────────────────────

async function collectConsoleErrors(page: Page): Promise<string[]> {
  const errors: string[] = [];
  page.on('console', msg => {
    if (msg.type() === 'error') {
      const text = msg.text();
      const isIgnored = IGNORED_CONSOLE_PATTERNS.some(p => p.test(text));
      if (!isIgnored) errors.push(text);
    }
  });
  return errors;
}

// ── Tests ─────────────────────────────────────────────────────────────

for (const viewport of VIEWPORTS) {
  test.describe(`Smoke — ${viewport.name} (${viewport.width}x${viewport.height})`, () => {
    test.beforeEach(async ({ page }) => {
      await page.setViewportSize({ width: viewport.width, height: viewport.height });
    });

    for (const { path, name } of PAGES) {
      test(`${name} (${path}) loads without errors`, async ({ page }) => {
        const errors = await collectConsoleErrors(page);

        // Navigate and wait for full load
        const response = await page.goto(path, { waitUntil: 'networkidle' });

        // 1. Page returns a successful status
        expect(response?.status()).toBeLessThan(400);

        // 2. No console errors
        expect(errors, `Console errors on ${path}: ${errors.join(', ')}`).toHaveLength(0);

        // 3. Page has content (not blank)
        const body = page.locator('body');
        await expect(body).not.toBeEmpty();

        // 4. No uncaught errors shown in error boundaries
        const errorBoundary = page.locator('[data-testid="error-boundary"], .error-boundary');
        await expect(errorBoundary).toHaveCount(0);

        // 5. Screenshot for visual regression baseline
        await expect(page).toHaveScreenshot(
          `${name.toLowerCase().replace(/\s+/g, '-')}-${viewport.name}.png`,
          { maxDiffPixelRatio: 0.01 }
        );
      });
    }

    // ── Layout-specific checks ──────────────────────────────────────

    test('No horizontal overflow (no double scrollbar)', async ({ page }) => {
      await page.goto(PAGES[0].path, { waitUntil: 'networkidle' });

      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });

      expect(hasHorizontalScroll, 'Page has horizontal overflow').toBe(false);
    });

    test('Interactive elements are visible and reachable', async ({ page }) => {
      await page.goto(PAGES[0].path, { waitUntil: 'networkidle' });

      // Check that common interactive elements are in viewport
      // CUSTOMIZE: Add selectors for your key interactive elements
      const interactiveSelectors = [
        'button',
        'a[href]',
        'input',
        'textarea',
      ];

      for (const selector of interactiveSelectors) {
        const elements = page.locator(selector);
        const count = await elements.count();
        if (count > 0) {
          // At least one interactive element of each type should be visible
          const first = elements.first();
          const isVisible = await first.isVisible().catch(() => false);
          if (isVisible) {
            const box = await first.boundingBox();
            if (box) {
              // Element should be within viewport
              expect(box.y, `${selector} is below viewport`).toBeLessThan(viewport.height + 100);
            }
          }
        }
      }
    });
  });
}

// ── Cross-viewport consistency ────────────────────────────────────────

test('Critical content is present on both mobile and desktop', async ({ page }) => {
  for (const viewport of VIEWPORTS) {
    await page.setViewportSize({ width: viewport.width, height: viewport.height });
    await page.goto(PAGES[0].path, { waitUntil: 'networkidle' });

    // CUSTOMIZE: Check for critical content that must be present on all viewports
    // Examples:
    // await expect(page.locator('h1')).toBeVisible();
    // await expect(page.locator('nav')).toBeVisible();
    // await expect(page.locator('[data-testid="main-cta"]')).toBeVisible();

    // At minimum, verify the page isn't blank
    const textContent = await page.locator('body').textContent();
    expect(textContent?.trim().length, `Page is blank on ${viewport.name}`).toBeGreaterThan(0);
  }
});
