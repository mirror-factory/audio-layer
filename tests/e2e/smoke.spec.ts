/**
 * Smoke tests -- verify every page loads with a 200 status,
 * renders a title element, and shows no error banner.
 */

import { test, expect } from "@playwright/test";

const PAGES = [
  { path: "/", name: "Home" },
  { path: "/record", name: "Record" },
  { path: "/record/live", name: "Live Recording" },
  { path: "/meetings", name: "Meetings" },
  { path: "/chat", name: "Chat" },
  { path: "/settings", name: "Settings" },
  { path: "/download", name: "Download" },
  { path: "/pricing", name: "Pricing" },
  { path: "/usage", name: "Usage" },
  { path: "/profile", name: "Profile" },
  { path: "/sign-in", name: "Sign In" },
  { path: "/sign-up", name: "Sign Up" },
  { path: "/docs", name: "Docs" },
  { path: "/observability", name: "Observability" },
];

for (const { path, name } of PAGES) {
  test(`${name} (${path}) loads with 200 and renders`, async ({ page }) => {
    test.setTimeout(20_000);

    const response = await page.goto(path, { waitUntil: "domcontentloaded" });

    // Page returns 200
    expect(response?.status()).toBe(200);

    // Body has content
    const body = page.locator("body");
    await expect(body).not.toBeEmpty();

    // A heading or title element exists somewhere on the page
    const heading = page.locator('h1, h2, h3, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 5_000 });

    // No error boundary visible
    const errorBoundary = page.locator(
      '[data-testid="error-boundary"], .error-boundary',
    );
    await expect(errorBoundary).toHaveCount(0);
  });
}
