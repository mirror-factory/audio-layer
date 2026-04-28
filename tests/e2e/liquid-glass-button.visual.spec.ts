import { test } from "@playwright/test";

test.skip("liquid-glass-button visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/liquid-glass-button.png", fullPage: true });
});
