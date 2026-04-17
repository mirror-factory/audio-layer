/**
 * /meetings list + detail smoke tests.
 *
 * Does not write to Supabase or hit AssemblyAI. Verifies:
 *   - /meetings renders (empty state is acceptable — CI has no data)
 *   - /meetings/unknown-id returns 404 via notFound()
 *   - Hub → Meetings navigation
 */

import { test, expect } from "@playwright/test";

test.describe("/meetings", () => {
  test("list page loads and offers a path back to the hub and to /record", async ({
    page,
  }) => {
    const res = await page.goto("/meetings", { waitUntil: "networkidle" });
    expect(res?.status()).toBeLessThan(400);
    await expect(page.getByRole("heading", { name: "Meetings" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: /new recording/i }),
    ).toBeVisible();
    await expect(page.getByRole("link", { name: /hub/i })).toBeVisible();
  });

  test("unknown id returns 404", async ({ page }) => {
    const res = await page.goto("/meetings/nonexistent-id-xyz", {
      waitUntil: "networkidle",
    });
    expect(res?.status()).toBe(404);
  });

  test("hub links to meetings", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    const link = page.getByRole("link", { name: /all meetings/i }).first();
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/meetings$/);
  });
});
