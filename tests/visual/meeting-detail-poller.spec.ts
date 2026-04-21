/**
 * Auto-scaffolded by sync-registries.ts for meeting-detail-poller.
 * Extend with interactive states, mocked props, etc. Runs across the
 * 6-project matrix (mobile/tablet/desktop x light/dark) from playwright.config.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('visual: meeting-detail-poller', () => {
  test.skip('matches baseline', async ({ page }, testInfo) => {
    // TODO: point at a Storybook URL / dedicated test page rendering meeting-detail-poller.
    await page.goto('/');
    await expect(page).toHaveScreenshot(
      `meeting-detail-poller-${testInfo.project.name}.png`,
      { animations: 'disabled', maxDiffPixelRatio: 0.01 },
    );
  });
});
