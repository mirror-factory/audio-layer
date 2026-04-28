import { test } from "@playwright/test";

test.skip("tool-card visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/tool-card.png", fullPage: true });
});
