import { test } from "@playwright/test";

test.skip("audio-recorder visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/audio-recorder.png", fullPage: true });
});
