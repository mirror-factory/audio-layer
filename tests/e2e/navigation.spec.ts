/**
 * Navigation tests -- verify links, buttons, and the slide menu work.
 */

import { test, expect } from "@playwright/test";

test.describe("Home page navigation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
  });

  test("has primary auth CTAs linking to sign-up and sign-in", async ({
    page,
  }) => {
    test.setTimeout(10_000);

    const getStarted = page
      .locator('a[href="/sign-up"]')
      .filter({ hasText: "Get started" });
    await expect(getStarted.first()).toBeVisible();

    const signIn = page
      .locator('a[href="/sign-in"]')
      .filter({ hasText: "Sign in" });
    await expect(signIn.first()).toBeVisible();
  });

  test("landing sections expose product, demo, and pricing content", async ({
    page,
  }) => {
    test.setTimeout(10_000);

    const expectedHeadings = [
      "Meeting intake, instantly.",
      "Built for real conversations",
      "See it in action",
      "Simple pricing",
    ];

    for (const heading of expectedHeadings) {
      await expect(page.getByRole("heading", { name: heading })).toBeVisible();
    }
  });
});

test.describe("TopBar back button", () => {
  test("navigates back after app-shell link navigation", async ({ page }) => {
    test.setTimeout(10_000);

    await page.goto("/record", { waitUntil: "load" });
    const menuButton = page.locator('button[aria-label="Open account menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();
    const nav = page.locator('nav[aria-label="Account navigation"]');
    await expect(nav).toHaveClass(/translate-x-0/);
    await nav.locator('a[href="/settings"]').click();
    await page.waitForURL("**/settings");

    const backButton = page.locator('button[aria-label="Go back"]');
    await expect(backButton).toBeVisible();

    await backButton.click();
    await page.waitForURL("**/record");
  });
});

test.describe("Slide menu", () => {
  test("settings menu opens and shows user-facing nav links only", async ({
    page,
  }) => {
    test.setTimeout(10_000);

    await page.goto("/record", { waitUntil: "load" });

    // Open the menu
    const menuButton = page.locator('button[aria-label="Open account menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // The slide menu nav should be visible
    const nav = page.locator('nav[aria-label="Account navigation"]');
    await expect(nav).toHaveClass(/translate-x-0/);

    // Check that account items are present and workspace links stay on the app surface.
    const expectedItems = ["Profile", "Usage", "Plan", "Settings"];

    for (const label of expectedItems) {
      await expect(nav.locator("a", { hasText: label }).first()).toBeVisible();
    }

    const hiddenInternalItems = [
      "Pricing Admin",
      "Roadmap",
      "Documentation",
      "Observability",
      "Record",
      "Meetings",
      "Search",
      "Chat",
    ];

    for (const label of hiddenInternalItems) {
      await expect(nav.locator("a", { hasText: label })).toHaveCount(0);
    }
  });

  test("close button dismisses menu", async ({ page }) => {
    test.setTimeout(10_000);

    await page.goto("/record", { waitUntil: "load" });

    const menuButton = page.locator('button[aria-label="Open account menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    const nav = page.locator('nav[aria-label="Account navigation"]');
    await expect(nav).toHaveClass(/translate-x-0/);

    const closeButton = page.locator('button[aria-label="Close account menu"]');
    await expect(closeButton).toBeVisible();
    await closeButton.click();

    // Menu should slide away (translate-x-full makes it invisible)
    await expect(nav).toHaveClass(/translate-x-full/);
  });
});
