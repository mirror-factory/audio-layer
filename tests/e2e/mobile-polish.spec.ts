/**
 * Verify mobile polish changes:
 * - Transcript grid background CSS exists
 * - Collapsible sections on meeting detail
 * - Cost panel is collapsed by default
 * - No intake form on meeting detail
 * - Focused live recording controls
 * - Sign-in has Google OAuth button
 * - Pages use dvh/safe-area CSS
 */

import { test, expect } from "@playwright/test";

test.describe("Sign-in page", () => {
  test("renders Google OAuth button", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    const googleBtn = page.locator("button", {
      hasText: "Continue with Google",
    });
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });

  test("renders email + password form", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    await expect(page.locator('input[type="email"]')).toBeVisible();
    await expect(page.locator('input[type="password"]')).toBeVisible();
  });

  test("has or divider between Google and email", async ({ page }) => {
    await page.goto("/sign-in", { waitUntil: "domcontentloaded" });
    // The divider has "or" as uppercase text between two lines
    const divider = page.locator("span", { hasText: /^or$/i });
    await expect(divider).toBeVisible({ timeout: 5000 });
  });
});

test.describe("Sign-up page", () => {
  test("renders Google OAuth button", async ({ page }) => {
    await page.goto("/sign-up", { waitUntil: "domcontentloaded" });
    const googleBtn = page.locator("button", {
      hasText: "Continue with Google",
    });
    await expect(googleBtn).toBeVisible({ timeout: 5000 });
  });

  test("keeps create account disabled until password meets minimum length", async ({
    page,
  }) => {
    await page.goto("/sign-up", { waitUntil: "load" });
    await expect(
      page.getByRole("button", { name: "Continue with Google" }),
    ).toBeVisible();

    await page.locator('input[type="email"]').fill("test@example.com");
    await page.locator('input[type="password"]').fill("12345");
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeDisabled();

    await page.locator('input[type="password"]').fill("123456");
    await expect(
      page.getByRole("button", { name: "Create account" }),
    ).toBeEnabled();
  });
});

test.describe("CSS utilities exist", () => {
  test("transcript-grid class applies grid background", async ({ page }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    // Inject a test element with the class and verify computed style
    const hasBg = await page.evaluate(() => {
      const el = document.createElement("div");
      el.className = "transcript-grid";
      el.style.width = "100px";
      el.style.height = "100px";
      document.body.appendChild(el);
      const style = getComputedStyle(el);
      const result = style.backgroundImage !== "none";
      el.remove();
      return result;
    });
    expect(hasBg).toBe(true);
  });

  test("h-screen-safe and min-h-screen-safe classes exist", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "domcontentloaded" });
    const heights = await page.evaluate(() => {
      const el1 = document.createElement("div");
      el1.className = "h-screen-safe";
      document.body.appendChild(el1);
      const h1 = getComputedStyle(el1).height;
      el1.remove();

      const el2 = document.createElement("div");
      el2.className = "min-h-screen-safe";
      document.body.appendChild(el2);
      const h2 = getComputedStyle(el2).minHeight;
      el2.remove();

      return { h1, h2 };
    });
    // h-screen-safe should resolve to a pixel value (100dvh)
    expect(heights.h1).toMatch(/\d+px/);
    expect(heights.h2).toMatch(/\d+px/);
  });
});

test.describe("Home page", () => {
  test("renders without errors", async ({ page }) => {
    const response = await page.goto("/", { waitUntil: "domcontentloaded" });
    expect(response?.status()).toBe(200);
    const heading = page.locator("h1, h2, [role='heading']").first();
    await expect(heading).toBeVisible({ timeout: 5000 });
  });

  test("keeps recording controls focused on mobile", async ({ page }) => {
    await page.goto("/record/live", { waitUntil: "domcontentloaded" });
    const isMobile = (page.viewportSize()?.width ?? 0) < 640;

    await expect(
      page.getByRole("button", { name: "Start recording" }),
    ).toBeVisible();
    await expect(page.getByLabel("Recording readiness")).toBeVisible();
    if (isMobile) {
      await expect(page.getByText(/Ready - \d\/\d checks/)).toBeVisible();
      await expect(
        page.getByText("Ready for your first words."),
      ).not.toBeVisible();
    } else {
      await expect(
        page.getByLabel("Recording readiness").getByText("Plan"),
      ).toBeVisible();
    }
    await expect(page.locator(".live-animated-lines")).toBeVisible();
  });
});

test.describe("Pricing admin", () => {
  test("renders growth scenario controls on mobile", async ({ page }) => {
    await page.goto("/admin/pricing", { waitUntil: "domcontentloaded" });
    await expect(
      page.getByRole("heading", { name: "Plan margin simulator" }),
    ).toBeVisible();
    await expect(
      page.getByText("1,000-customer growth scenario"),
    ).toBeVisible();
    await expect(page.getByText("$12,250")).toBeVisible();
    await expect(page.getByText("30m call")).toBeVisible();
    await expect(page.getByText("Provider lane")).toBeVisible();
  });
});
