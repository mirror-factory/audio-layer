import { test } from "@playwright/test";

test.skip("meeting-notes-push-panel visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/meeting-notes-push-panel.png", fullPage: true });
});
