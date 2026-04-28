import { test } from "@playwright/test";

test.skip("web-gl-shader visual proof", async ({ page }) => {
  await page.goto("/");
  await page.screenshot({ path: ".evidence/screenshots/web-gl-shader.png", fullPage: true });
});
