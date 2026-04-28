import { test } from "@playwright/test";

test.skip("meeting-search visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/meeting-search.png", fullPage: true });
});
