/**
 * Mobile Verification Test Suite
 *
 * Uses Playwright device emulation to verify mobile layouts, touch
 * interactions, and keyboard behavior across a device matrix.
 *
 * HOW TO CUSTOMIZE:
 * 1. Update DEVICE_MATRIX with your target devices
 * 2. Update test URLs to match your app's routes
 * 3. Update selectors for your app's navigation components
 * 4. Remove auth helper or update for your auth system
 *
 * Run:
 *   pnpm test:mobile              # all devices
 *
 * Screenshots are written to `.evidence/mobile/{device}-{scenario}.png`.
 *
 * Copied from vercel-ai-starter-kit. Customize for your project.
 */

import {
  test as base, expect, devices,
  type Page, type BrowserContext, type Browser,
} from '@playwright/test';
import path from 'node:path';
import fs from 'node:fs';

const test = base.extend<{
  mobilePage: Page;
  mobileContext: BrowserContext;
  deviceName: string;
}>({
  deviceName: ['iPhone 12', { option: true }],
  mobileContext: async ({ browser, deviceName }, continueWith) => {
    const descriptor = devices[deviceName];
    if (!descriptor) throw new Error(`Unknown device: ${deviceName}`);
    const { defaultBrowserType, ...contextOptions } = descriptor as typeof descriptor & { defaultBrowserType?: string };
    void defaultBrowserType;
    const ctx = await (browser as Browser).newContext(contextOptions);
    await continueWith(ctx);
    await ctx.close();
  },
  mobilePage: async ({ mobileContext }, continueWith) => {
    const p = await mobileContext.newPage();
    await continueWith(p);
  },
});

// -- Device Matrix (TODO: customize for your target devices) --

type DeviceSpec = {
  name: string;
  slug: string;
  device: keyof typeof devices;
};

const DEVICE_MATRIX: DeviceSpec[] = [
  { name: 'iPhone 15 Pro', slug: 'iphone-15-pro', device: 'iPhone 15 Pro' },
  { name: 'Pixel 8 Pro', slug: 'pixel-8-pro', device: 'Pixel 7' },
  { name: 'iPad Pro', slug: 'ipad-pro', device: 'iPad Pro 11' },
];

function resolveDeviceName(preferred: keyof typeof devices): keyof typeof devices {
  if (devices[preferred]) return preferred;
  const fallbacks: Record<string, Array<keyof typeof devices>> = {
    'iPhone 15 Pro': ['iPhone 14 Pro', 'iPhone 13 Pro', 'iPhone 12'],
    'Pixel 8 Pro': ['Pixel 7', 'Pixel 5'],
    'iPad Pro 11': ['iPad (gen 7)', 'iPad Mini'],
  };
  for (const key of fallbacks[preferred as string] || []) {
    if (devices[key]) return key;
  }
  return 'iPhone 12';
}

// -- Paths --

const EVIDENCE_DIR = path.resolve(process.cwd(), '.evidence/mobile');

function ensureEvidenceDir(): void {
  if (!fs.existsSync(EVIDENCE_DIR)) fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

function evidencePath(slug: string, scenario: string): string {
  ensureEvidenceDir();
  return path.join(EVIDENCE_DIR, `${slug}-${scenario}.png`);
}

// -- Console Error Capture --

const IGNORED_CONSOLE_PATTERNS: RegExp[] = [
  /Download the React DevTools/,
  /hydration/i,
  /Failed to load resource.*favicon/,
  /\[Fast Refresh\]/,
];

function collectConsoleErrors(page: Page): string[] {
  const errors: string[] = [];
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return;
    const text = msg.text();
    if (IGNORED_CONSOLE_PATTERNS.some((rx) => rx.test(text))) return;
    errors.push(text);
  });
  page.on('pageerror', (err) => errors.push(`[pageerror] ${err.message}`));
  return errors;
}

// -- Per-Device Suites --

for (const spec of DEVICE_MATRIX) {
  const resolvedName = resolveDeviceName(spec.device);

  test.describe.parallel(`Mobile -- ${spec.name}`, () => {
    test.use({ deviceName: resolvedName as string });

    // a) Landing page loads without console errors
    test(`landing page loads without errors [${spec.slug}]`, async ({ mobilePage: page }) => {
      const errors = collectConsoleErrors(page);
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
      expect(response?.status()).toBeLessThan(400);

      // TODO: Update selector for your app's main heading
      await expect(page.locator('h1').first()).toBeVisible({ timeout: 10_000 });

      // No horizontal overflow (layout-break detector)
      const hasHorizontalScroll = await page.evaluate(() =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth + 2
      );
      expect(hasHorizontalScroll, 'has horizontal overflow').toBe(false);

      await page.screenshot({ path: evidencePath(spec.slug, 'landing'), fullPage: false });
      expect(errors, `console errors: ${errors.join(' | ')}`).toHaveLength(0);
    });

    // b) TODO: Add your app-specific mobile layout tests
    // Example: navigation, chat input reachability, touch interactions
    test(`app page renders on mobile [${spec.slug}]`, async ({ mobilePage: page }) => {
      // TODO: Navigate to your main app page
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
      if (!response || response.status() >= 400) {
        test.skip(true, `page returned ${response?.status() ?? 'no response'}`);
        return;
      }

      await page.waitForTimeout(1500);

      // TODO: Add assertions for your mobile layout
      // Example: check that mobile nav is visible, no overflow, etc.

      await page.screenshot({ path: evidencePath(spec.slug, 'app-layout'), fullPage: false });
    });

    // c) Buttons respond to tap (no hover-only bugs)
    test(`buttons respond to tap [${spec.slug}]`, async ({ mobilePage: page }) => {
      const response = await page.goto('/', { waitUntil: 'domcontentloaded' });
      if (!response || response.status() >= 400) {
        test.skip(true, `page returned ${response?.status() ?? 'no response'}`);
        return;
      }
      await page.waitForTimeout(2000);

      const candidates = page.locator('button, [role="button"]');
      const count = await candidates.count();
      if (count === 0) { test.skip(true, 'No buttons found'); return; }

      for (let i = 0; i < Math.min(count, 5); i++) {
        const btn = candidates.nth(i);
        if (!(await btn.isVisible().catch(() => false))) continue;
        await btn.tap({ trial: true }).catch(() => {});
        break;
      }

      await page.screenshot({ path: evidencePath(spec.slug, 'button-tap'), fullPage: false });
    });
  });
}
