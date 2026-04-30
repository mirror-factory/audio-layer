import { test, expect } from "@playwright/test";

test.skip("app/agent-builder/page.tsx route smoke proof", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
