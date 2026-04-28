import { test } from "@playwright/test";

test.skip("live-transcript-view visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/live-transcript-view.png", fullPage: true });
});
