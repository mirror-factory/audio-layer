import { test } from "@playwright/test";

test.skip("audio-wave-ribbon visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/audio-wave-ribbon.png", fullPage: true });
});
