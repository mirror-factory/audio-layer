import { test } from "@playwright/test";

test.skip("button visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/button.png", fullPage: true });
});
