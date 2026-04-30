import { test, expect } from "@playwright/test";

test("app/terms/page.tsx route smoke proof", async ({ page }) => {
  const response = await page.goto("/terms", {
    waitUntil: "domcontentloaded",
  });
  expect(response?.status()).toBe(200);

  await expect(
    page.getByRole("heading", { name: "Terms of Service" }),
  ).toBeVisible();
  await expect(page.getByText("Launch draft - legal review pending")).toBeVisible();
  await expect(
    page.getByLabel("Legal navigation").getByRole("link", {
      name: "Privacy",
      exact: true,
    }),
  ).toBeVisible();
});
