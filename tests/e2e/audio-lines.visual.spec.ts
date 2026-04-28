import { test } from "@playwright/test";

test.skip("audio-lines visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/audio-lines.png", fullPage: true });
});
