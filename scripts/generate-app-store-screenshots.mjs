import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "docs/design/app-store-screenshots.html");
const outputDir = path.join(root, "output/app-store");

const shots = [
  "01-fast-record",
  "02-bot-free",
  "03-structured-intake",
  "04-ask-library",
  "05-cost-control",
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1500, height: 3100 },
  deviceScaleFactor: 1,
});

await page.goto(`file://${source}`);
await page.evaluate(async () => {
  await document.fonts.ready;
});

for (const id of shots) {
  await page.locator(`[id="${id}"]`).screenshot({
    path: path.join(outputDir, `${id}.png`),
  });
}

await browser.close();
