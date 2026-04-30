import { test } from "@playwright/test";

test.skip("session-workspace visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/session-workspace.png", fullPage: true });
});
