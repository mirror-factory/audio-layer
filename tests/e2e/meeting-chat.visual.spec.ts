import { test } from "@playwright/test";

test.skip("meeting-chat visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/meeting-chat.png", fullPage: true });
});
