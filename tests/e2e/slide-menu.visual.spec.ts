import { test } from "@playwright/test";

test.skip("slide-menu visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/slide-menu.png", fullPage: true });
});
