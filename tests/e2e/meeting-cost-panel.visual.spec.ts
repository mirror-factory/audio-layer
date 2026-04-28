import { test } from "@playwright/test";

test.skip("meeting-cost-panel visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/meeting-cost-panel.png", fullPage: true });
});
