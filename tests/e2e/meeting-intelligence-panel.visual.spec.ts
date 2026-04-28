import { test } from "@playwright/test";

test.skip("meeting-intelligence-panel visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/meeting-intelligence-panel.png", fullPage: true });
});
