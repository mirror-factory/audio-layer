import { test } from "@playwright/test";

test.skip("top-bar visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/top-bar.png", fullPage: true });
});
