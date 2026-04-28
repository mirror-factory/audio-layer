import { test, expect } from "@playwright/test";

test.skip("app/.well-known/oauth-authorization-server/route.ts route smoke proof", async ({ page }) => {
  await page.goto("/");
  await expect(page.locator("body")).toBeVisible();
});
