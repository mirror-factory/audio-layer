import { test } from "@playwright/test";

test.skip("meeting-detail-poller visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/meeting-detail-poller.png", fullPage: true });
});
