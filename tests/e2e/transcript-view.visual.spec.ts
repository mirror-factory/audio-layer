import { test } from "@playwright/test";

test.skip("transcript-view visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/transcript-view.png", fullPage: true });
});
