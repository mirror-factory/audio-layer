import { test, expect } from "@playwright/test";

test("app/page.tsx route smoke proof", async ({ page }) => {
  const response = await page.goto("/", { waitUntil: "domcontentloaded" });
  expect(response?.status()).toBe(200);

  await expect(page.locator("body")).not.toBeEmpty();

  const signedOutHeading = page.getByRole("heading", {
    name: "Turn meetings into structured team memory.",
  });
  const signedInRecorder = page.getByRole("button", {
    name: /start recording|stop recording/i,
  });

  await expect(signedOutHeading.or(signedInRecorder).first()).toBeVisible({
    timeout: 10_000,
  });
});
