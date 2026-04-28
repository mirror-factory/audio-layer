import { test } from "@playwright/test";

test.skip("intake-form-view visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/intake-form-view.png", fullPage: true });
});
