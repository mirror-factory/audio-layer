import { test } from "@playwright/test";

test.skip("ai-debug-panel visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/ai-debug-panel.png", fullPage: true });
});
