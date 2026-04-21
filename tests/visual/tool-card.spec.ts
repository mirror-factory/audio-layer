/**
 * Auto-scaffolded by sync-registries.ts for tool-card.
 * Extend with interactive states, mocked props, etc. Runs across the
 * 6-project matrix (mobile/tablet/desktop x light/dark) from playwright.config.ts.
 */
import { test, expect } from '@playwright/test';

test.describe('visual: tool-card', () => {
  test.skip('matches baseline', async ({ page }, testInfo) => {
    // TODO: point at a Storybook URL / dedicated test page rendering tool-card.
    await page.goto('/');
    await expect(page).toHaveScreenshot(
      `tool-card-${testInfo.project.name}.png`,
      { animations: 'disabled', maxDiffPixelRatio: 0.01 },
    );
  });
});
