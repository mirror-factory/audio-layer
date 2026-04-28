/**
 * Auto-scaffolded visual coverage placeholder for meeting-chat.
 * Replace the skipped baseline with a dedicated fixture page once the visual
 * harness has stable component fixture routes.
 */
import { test, expect } from '@playwright/test';

test.describe('visual: meeting-chat', () => {
  test.skip('matches baseline', async ({ page }, testInfo) => {
    await page.goto('/');
    await expect(page).toHaveScreenshot(
      `meeting-chat-${testInfo.project.name}.png`,
      { animations: 'disabled', maxDiffPixelRatio: 0.01 },
    );
  });
});
