/**
 * Product feature checklist.
 *
 * These tests intentionally avoid microphone prompts, paid providers, payment
 * redirects, and auth submissions. They verify each core feature surface is
 * present and handles safe local interactions.
 */

import { test, expect } from "@playwright/test";

test.describe("Feature checklist", () => {
  test("landing page exposes product positioning, demo, pricing, and auth CTAs", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "load" });

    await expect(
      page.getByRole("heading", { name: "Meeting intake, instantly." }),
    ).toBeVisible();
    await expect(page.getByLabel("Live meeting capture preview")).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Built for real conversations" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "See it in action" }),
    ).toBeVisible();
    await expect(
      page.getByRole("heading", { name: "Simple pricing" }),
    ).toBeVisible();
    await expect(
      page
        .locator('a[href="/sign-up"]')
        .filter({ hasText: "Get started" })
        .first(),
    ).toBeVisible();
    await expect(
      page.locator('a[href="/sign-in"]').filter({ hasText: "Sign in" }).first(),
    ).toBeVisible();
  });

  test("recording surfaces render without requesting microphone access", async ({
    page,
  }) => {
    await page.goto("/record", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { name: "Batch Recording" }),
    ).toBeVisible();
    await expect(
      page.getByRole("button", { name: "Start recording" }),
    ).toBeVisible();
    await expect(
      page.getByText("Drop audio file or click to browse"),
    ).toBeVisible();

    await page.goto("/record/live", { waitUntil: "load" });
    await expect(
      page.getByRole("button", { name: "Start recording" }),
    ).toBeVisible();
    await expect(page.getByLabel("Recording readiness")).toBeVisible();
    await expect(
      page.getByText(/Tap to start taking notes|Checking recording setup/),
    ).toBeVisible();
    await expect(page.locator("main")).not.toBeEmpty();
  });

  test("meeting, search, and chat empty states are usable", async ({
    page,
  }) => {
    await page.goto("/meetings", { waitUntil: "load" });
    await expect(
      page.getByPlaceholder("Search across all meetings..."),
    ).toBeVisible();
    await expect(page.getByText("No meetings yet.")).toBeVisible();

    await page.goto("/search", { waitUntil: "load" });
    await page.getByPlaceholder("Search meetings...").fill("budget");
    await page.getByRole("button", { name: "Search" }).click();
    await expect(
      page.getByText("No results found. Try a different search term."),
    ).toBeVisible();

    await page.goto("/chat", { waitUntil: "load" });
    await expect(
      page.getByText("Ask anything from your meeting library."),
    ).toBeVisible();
    await expect(
      page.getByPlaceholder("Ask about your meetings..."),
    ).toBeVisible();
  });

  test("settings model controls persist safe local changes", async ({
    page,
  }) => {
    await page.goto("/settings", { waitUntil: "load" });

    const batchSpeech = page
      .locator(".glass-card")
      .filter({ hasText: "Batch Speech Model" })
      .locator("select");
    await expect(batchSpeech).toBeVisible();
    await batchSpeech.selectOption("universal-3-pro");
    await expect(batchSpeech).toHaveValue("universal-3-pro");
  });

  test("pricing and account pages render without starting checkout or auth submissions", async ({
    page,
  }) => {
    await page.goto("/pricing", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { name: "Simple, transparent pricing" }),
    ).toBeVisible();
    await expect(page.getByText("Current plan")).toBeVisible();
    await expect(page.getByRole("button", { name: "Subscribe" })).toHaveCount(
      2,
    );

    await page.goto("/sign-in", { waitUntil: "load" });
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();

    await page.goto("/sign-up", { waitUntil: "load" });
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("dev and observability surfaces render", async ({ page }) => {
    await page.goto("/observability", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { name: "AI Observability" }),
    ).toBeVisible();
    await expect(page.getByText("Auto-refresh")).toBeVisible();

    await page.goto("/dev-kit/status", { waitUntil: "load" });
    await expect(page.locator("body")).not.toBeEmpty();
  });

  test("observability fits the mobile viewport without page-level horizontal overflow", async ({
    page,
  }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto("/observability", { waitUntil: "load" });
    await expect(
      page.getByRole("heading", { name: "AI Observability" }),
    ).toBeVisible();

    const overflow = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(overflow.scrollWidth).toBeLessThanOrEqual(overflow.clientWidth + 1);
  });
});
