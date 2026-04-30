/**
 * Visual coverage hook for the shared session workspace.
 * The high-fidelity browser proof is captured through /record/live.
 */
import { expect, test } from "@playwright/test";

test.skip("session-workspace visual proof", async ({ page }, testInfo) => {
  await page.goto("/record/live");
  await expect(page).toHaveScreenshot(
    `session-workspace-${testInfo.project.name}.png`,
    { animations: "disabled", maxDiffPixelRatio: 0.01 },
  );
});
