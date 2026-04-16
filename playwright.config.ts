/**
 * Minimal Playwright config for Next.js projects.
 *
 * Install: pnpm add -D @playwright/test
 * Run:     pnpm exec playwright test
 * UI:      pnpm exec playwright test --ui
 *
 * Example test specs (create these in tests/e2e/):
 *
 * // tests/e2e/home.spec.ts
 * // import { test, expect } from '@playwright/test';
 * // test('home page loads', async ({ page }) => {
 * //   await page.goto('/');
 * //   await expect(page).toHaveTitle(/My AI App/);
 * // });
 *
 * // tests/e2e/chat.spec.ts
 * // test('chat input accepts text', async ({ page }) => {
 * //   await page.goto('/chat');
 * //   const input = page.getByPlaceholder('Message');
 * //   await input.fill('Hello');
 * //   await expect(input).toHaveValue('Hello');
 * // });
 *
 * // tests/e2e/api-health.spec.ts
 * // test('API health endpoint returns 200', async ({ request }) => {
 * //   const response = await request.get('/api/health');
 * //   expect(response.ok()).toBeTruthy();
 * // });
 *
 * // tests/e2e/auth.spec.ts
 * // test('unauthenticated user redirected to login', async ({ page }) => {
 * //   await page.goto('/dashboard');
 * //   await expect(page).toHaveURL(/login/);
 * // });
 */

import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: "html",

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },

  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],

  webServer: {
    command: "pnpm dev",
    url: "http://localhost:3000",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
