import { test } from "@playwright/test";

test.skip("live-recorder visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/live-recorder.png", fullPage: true });
});
