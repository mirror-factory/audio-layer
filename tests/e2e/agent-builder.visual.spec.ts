import { test } from "@playwright/test";

test.skip("agent-builder visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/agent-builder.png", fullPage: true });
});
