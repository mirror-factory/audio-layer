import { mkdirSync } from "fs";
import { test, expect } from "@playwright/test";

test("ai-debug-panel visual proof records a browser event", async ({ page }) => {
  await page.goto("/control-plane", { waitUntil: "networkidle" });

  await page.evaluate(() => {
    window.dispatchEvent(
      new CustomEvent("ai-debug", {
        detail: {
          id: "debug-visual-1",
          label: "visual-proof",
          provider: "vercel-ai-gateway",
          modelId: "anthropic/claude-haiku-4-5",
          duration: 860,
          steps: 2,
          inputTokens: 1440,
          outputTokens: 380,
          cost: 0.0029,
          toolCalls: ["searchDocuments"],
          cacheReadTokens: 0,
          cacheWriteTokens: 0,
          timestamp: Date.now(),
        },
      }),
    );
  });

  await expect(page.getByText("AI Debug").first()).toBeVisible();
  await expect(page.getByText("visual-proof").first()).toBeVisible();

  mkdirSync(".evidence/screenshots", { recursive: true });
  await page.screenshot({
    path: ".evidence/screenshots/ai-debug-panel.png",
    fullPage: true,
  });
});
