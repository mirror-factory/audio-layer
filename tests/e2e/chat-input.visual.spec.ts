import { test } from "@playwright/test";

test.skip("chat-input visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/chat-input.png", fullPage: true });
});
