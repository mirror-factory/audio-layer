import { test } from "@playwright/test";

test.skip("recording-reminder visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/recording-reminder.png", fullPage: true });
});
