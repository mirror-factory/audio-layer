import { test } from "@playwright/test";

test.skip("integrations-settings-panel visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/integrations-settings-panel.png", fullPage: true });
});
