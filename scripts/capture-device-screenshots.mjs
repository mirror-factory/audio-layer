import { chromium } from "@playwright/test";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const baseUrl = (process.env.SCREENSHOT_BASE_URL ?? "http://localhost:3001").replace(/\/$/, "");
const stamp =
  process.env.SCREENSHOT_RUN_ID ??
  new Date().toISOString().slice(0, 10);
const outputDir =
  process.env.SCREENSHOT_OUTPUT_DIR ??
  path.join(root, "docs", "app-store", "device-screenshots", stamp);

const email = process.env.LAYER_SCREENSHOT_EMAIL ?? process.env.LAYER_TEST_EMAIL ?? "";
const password =
  process.env.LAYER_SCREENSHOT_PASSWORD ?? process.env.LAYER_TEST_PASSWORD ?? "";

const devices = [
  {
    id: "iphone-15-pro-max",
    label: "iPhone 15 Pro Max",
    viewport: { width: 430, height: 932 },
    scale: 3,
    userAgent:
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  },
  {
    id: "ipad-pro-12-9",
    label: "iPad Pro 12.9",
    viewport: { width: 1024, height: 1366 },
    scale: 2,
    userAgent:
      "Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1",
    isMobile: true,
    hasTouch: true,
  },
];

const themes = ["light", "dark"];

const demoMeetings = [
  {
    id: "demo-founder-pipeline",
    title: "Founder pipeline review",
    status: "completed",
    createdAt: "2026-04-28T13:30:00.000Z",
    durationSeconds: 1680,
  },
  {
    id: "demo-enterprise-intake",
    title: "Enterprise intake call",
    status: "completed",
    createdAt: "2026-04-27T18:15:00.000Z",
    durationSeconds: 2220,
  },
  {
    id: "demo-product-sync",
    title: "Product sync",
    status: "completed",
    createdAt: "2026-04-26T16:00:00.000Z",
    durationSeconds: 1320,
  },
  {
    id: "demo-live-note",
    title: "Writing notes...",
    status: "processing",
    createdAt: "2026-04-28T15:45:00.000Z",
    durationSeconds: 0,
  },
  {
    id: "demo-empty-note",
    title: "Untitled recording",
    status: "completed",
    createdAt: "2026-04-25T12:00:00.000Z",
    durationSeconds: 0,
  },
];

const demoCalendar = {
  connected: true,
  provider: "google",
  accountEmail: "alfonso@example.com",
  items: [
    {
      id: "cal-investor-prep",
      title: "Investor update prep",
      startsAt: "2026-04-28T18:30:00.000Z",
      endsAt: "2026-04-28T19:00:00.000Z",
      location: "Google Meet",
    },
    {
      id: "cal-design-review",
      title: "Design review",
      startsAt: "2026-04-29T15:00:00.000Z",
      endsAt: "2026-04-29T15:45:00.000Z",
      location: "Zoom",
    },
  ],
  limit: 3,
  setupRequired: false,
  providerSetupRequired: false,
  reauthRequired: false,
  calendarFetchFailed: false,
};

const demoPreflight = {
  status: "ready",
  checkedAt: "2026-04-28T13:00:00.000Z",
  checks: [
    {
      id: "quota",
      label: "Quota",
      status: "ready",
      detail: "Growth plan ready",
    },
    {
      id: "provider",
      label: "STT provider",
      status: "ready",
      detail: "AssemblyAI is configured",
    },
    {
      id: "pricing",
      label: "Cost source",
      status: "ready",
      detail: "$0.15/hr from Production pricing",
    },
    {
      id: "model",
      label: "Runtime model",
      status: "ready",
      detail: "Universal Streaming Multilingual 1",
    },
  ],
  provider: {
    id: "assemblyai-universal-streaming-multilingual-1",
    label: "AssemblyAI",
    model: "universal-streaming-multilingual-1",
    runtimeStatus: "implemented",
    effectiveRatePerHourUsd: 0.15,
    costPerThirtyMinutesUsd: 0.075,
    sourceUrl: "https://www.assemblyai.com/pricing",
  },
  quota: {
    planId: "growth",
    bypassed: true,
    meetingLimit: null,
    minuteLimit: null,
    monthlyMinutesUsed: 0,
  },
};

async function registerDemoRoutes(page) {
  await page.route("**/api/meetings?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/meetings") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ items: demoMeetings }),
    });
  });

  await page.route("**/api/calendar/upcoming?*", async (route) => {
    const url = new URL(route.request().url());
    if (url.pathname !== "/api/calendar/upcoming") return route.continue();
    return route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(demoCalendar),
    });
  });

  await page.route("**/api/transcribe/stream/preflight", async (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify(demoPreflight),
    }),
  );

  await page.route("**/api/meetings/demo-*", async (route) => {
    if (route.request().method() === "DELETE") {
      return route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ ok: true }),
      });
    }
    return route.continue();
  });
}

async function signInIfConfigured(page) {
  if (!email || !password) return false;

  await page.goto(`${baseUrl}/sign-in`, { waitUntil: "domcontentloaded" });
  const emailInput = page.getByPlaceholder("you@example.com");
  const passwordInput = page.getByPlaceholder("Password");
  await emailInput.click();
  await emailInput.fill("");
  await page.keyboard.type(email, { delay: 1 });
  await passwordInput.click();
  await passwordInput.fill("");
  await page.keyboard.type(password, { delay: 1 });
  await page
    .getByRole("button", { name: /^sign in$/i })
    .waitFor({ state: "visible", timeout: 20_000 });
  await page.waitForFunction(() => {
    const button = Array.from(document.querySelectorAll("button")).find(
      (candidate) => candidate.textContent?.trim().toLowerCase() === "sign in",
    );
    return Boolean(button && !button.disabled);
  });

  await page.getByRole("button", { name: /^sign in$/i }).click();
  await page.waitForFunction(
    () =>
      window.location.pathname === "/" ||
      document.body.innerText.toLowerCase().includes("sign in failed") ||
      document.body.innerText.toLowerCase().includes("invalid"),
    null,
    { timeout: 20_000 },
  );

  if (new URL(page.url()).pathname !== "/") {
    const body = await page.locator("body").innerText().catch(() => "");
    throw new Error(body.split("\n").slice(0, 8).join(" | ") || "Sign-in did not complete");
  }

  return true;
}

async function captureOne(browser, device, theme) {
  const context = await browser.newContext({
    viewport: device.viewport,
    deviceScaleFactor: device.scale,
    userAgent: device.userAgent,
    isMobile: device.isMobile,
    hasTouch: device.hasTouch,
    colorScheme: theme,
    locale: "en-US",
    timezoneId: "America/New_York",
    permissions: ["microphone"],
  });

  await context.addInitScript((selectedTheme) => {
    localStorage.setItem("theme", selectedTheme);
    localStorage.setItem("theme-design-version", "paper-calm-v1");
    document.documentElement.classList.remove("light", "dark");
    document.documentElement.classList.add(selectedTheme);
  }, theme);

  const page = await context.newPage();
  page.setDefaultTimeout(20_000);
  await registerDemoRoutes(page);

  const authenticated = await signInIfConfigured(page).catch((error) => {
    throw new Error(`Screenshot login failed: ${error instanceof Error ? error.message : String(error)}`);
  });

  if (!authenticated) {
    await page.goto(baseUrl, { waitUntil: "domcontentloaded" });
  }

  await page.waitForLoadState("networkidle");
  await page.waitForFunction(
    () => document.body.innerText.includes("Recent recordings"),
    null,
    { timeout: 20_000 },
  );
  await page.waitForTimeout(1200);

  const outputPath = path.join(outputDir, `${device.id}-home-${theme}.png`);
  await page.screenshot({ path: outputPath, fullPage: false });
  await context.close();

  return outputPath;
}

async function main() {
  await fs.mkdir(outputDir, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    args: [
      "--use-fake-ui-for-media-stream",
      "--use-fake-device-for-media-stream",
      "--disable-dev-shm-usage",
    ],
  });

  const captures = [];
  try {
    for (const device of devices) {
      for (const theme of themes) {
        captures.push({
          device: device.label,
          theme,
          path: await captureOne(browser, device, theme),
        });
      }
    }
  } finally {
    await browser.close();
  }

  const metadata = {
    generatedAt: new Date().toISOString(),
    baseUrl,
    authenticated: Boolean(email && password),
    routeMocks: [
      "/api/meetings?limit=5",
      "/api/calendar/upcoming?limit=3",
      "/api/transcribe/stream/preflight",
    ],
    captures,
  };
  await fs.writeFile(
    path.join(outputDir, "metadata.json"),
    JSON.stringify(metadata, null, 2),
    "utf8",
  );

  console.log(`Wrote ${captures.length} screenshots to ${path.relative(root, outputDir)}`);
  for (const capture of captures) {
    console.log(`- ${capture.device} ${capture.theme}: ${path.relative(root, capture.path)}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
