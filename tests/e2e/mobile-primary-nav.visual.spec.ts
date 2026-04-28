import { test } from "@playwright/test";

test.skip("mobile-primary-nav visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/mobile-primary-nav.png", fullPage: true });
});
