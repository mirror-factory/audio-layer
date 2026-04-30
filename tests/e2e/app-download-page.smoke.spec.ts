import { test, expect } from "@playwright/test";

test("app/download/page.tsx shows launch-ready channel states", async ({
  page,
}) => {
  await page.goto("/download");

  await expect(
    page.getByRole("heading", {
      name: "Start with the website. Add native beta builds as they go live.",
    }),
  ).toBeVisible();
  await expect(page.getByText("Website live").first()).toBeVisible();
  await expect(page.getByText("Desktop beta").first()).toBeVisible();
  await expect(page.getByText("TestFlight").first()).toBeVisible();
  await expect(page.getByText("Play internal testing").first()).toBeVisible();

  await expect(page.getByText("macOS 13 Ventura or later")).toBeVisible();
  await expect(
    page.getByText("64-bit Windows 10 or Windows 11"),
  ).toBeVisible();

  await expect(
    page.locator('a[href*="apps.apple.com/us/search"]'),
  ).toHaveCount(0);
  await expect(
    page.locator('a[href*="play.google.com/store/search"]'),
  ).toHaveCount(0);
  await expect(
    page.getByRole("link", { name: /Open Website live/ }).first(),
  ).toBeVisible();
});

test("app/download/page.tsx remains usable on mobile", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/download");

  await expect(
    page.getByRole("link", { name: /Open Website live/ }).first(),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "iPhone and iPad" }),
  ).toBeVisible();
  await expect(
    page.getByText("Requires Apple's TestFlight app"),
  ).toBeVisible();
});
