import { test } from "@playwright/test";

test.skip("theme-toggle visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/theme-toggle.png", fullPage: true });
});
