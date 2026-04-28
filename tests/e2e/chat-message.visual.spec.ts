import { test } from "@playwright/test";

test.skip("chat-message visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/chat-message.png", fullPage: true });
});
