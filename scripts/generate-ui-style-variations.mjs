import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, "..");
const source = path.join(root, "docs/design/ui-style-variations.html");
const outputDir = path.join(root, "output/design/ui-variations");

const shots = [
  "noir-iphone",
  "noir-desktop",
  "paper-iphone",
  "paper-desktop",
  "native-iphone",
  "native-desktop",
  "workbench-iphone",
  "workbench-desktop",
];

await fs.mkdir(outputDir, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: 1940, height: 1120 },
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

await page.screenshot({
  path: path.join(outputDir, "contact-sheet.png"),
  fullPage: true,
});

await browser.close();
