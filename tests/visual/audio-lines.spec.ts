/**
 * Auto-scaffolded by sync-registries.ts for audio-lines.
 * Extend with interactive states, mocked props, etc. Runs across the
 * 6-project matrix (mobile/tablet/desktop x light/dark) from playwright.config.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('visual: audio-lines', () => {
  test.skip('matches baseline', async ({ page }, testInfo) => {
    // TODO: point at a Storybook URL / dedicated test page rendering audio-lines.
    await page.goto('/');
    await expect(page).toHaveScreenshot(
      `audio-lines-${testInfo.project.name}.png`,
      { animations: 'disabled', maxDiffPixelRatio: 0.01 },
    );
  });
});
