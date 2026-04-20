/**
 * Navigation tests -- verify links, buttons, and the slide menu work.
 */

import { test, expect } from '@playwright/test';

test.describe('Home page navigation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('has a "Start Recording" button linking to /record/live', async ({ page }) => {
    test.setTimeout(10_000);

    const cta = page.locator('a', { hasText: 'Start Recording' });
    await expect(cta).toBeVisible();
    await expect(cta).toHaveAttribute('href', '/record/live');
  });

  test('navigation grid links render and point to correct routes', async ({ page }) => {
    test.setTimeout(10_000);

    const expectedLinks = [
      { label: 'Record', href: '/record' },
      { label: 'Live', href: '/record/live' },
      { label: 'Meetings', href: '/meetings' },
      { label: 'Chat', href: '/chat' },
      { label: 'Settings', href: '/settings' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Usage', href: '/usage' },
      { label: 'Profile', href: '/profile' },
    ];

    for (const { label, href } of expectedLinks) {
      const link = page.locator('a', { hasText: label }).filter({ hasText: label });
      await expect(link.first()).toHaveAttribute('href', href);
    }
  });
});

test.describe('TopBar back button', () => {
  test('navigates back when clicked', async ({ page }) => {
    test.setTimeout(10_000);

    // Navigate from Home -> Meetings so there's history to go back to
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    const backButton = page.locator('button[aria-label="Go back"]');
    await expect(backButton).toBeVisible();

    await backButton.click();
    await page.waitForURL('**/');
  });
});

test.describe('Slide menu', () => {
  test('hamburger menu opens and shows all nav links', async ({ page }) => {
    test.setTimeout(10_000);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Open the menu
    const menuButton = page.locator('button[aria-label="Open menu"]');
    await expect(menuButton).toBeVisible();
    await menuButton.click();

    // The slide menu nav should be visible
    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    // Check that all expected nav items are present
    const expectedItems = [
      'Home',
      'Record',
      'Live Recording',
      'Meetings',
      'Chat',
      'Settings',
      'Pricing',
      'Usage',
      'Profile',
      'Documentation',
      'Observability',
    ];

    for (const label of expectedItems) {
      await expect(nav.locator('a', { hasText: label }).first()).toBeVisible();
    }
  });

  test('close button dismisses menu', async ({ page }) => {
    test.setTimeout(10_000);

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    const menuButton = page.locator('button[aria-label="Open menu"]');
    await menuButton.click();

    const nav = page.locator('nav[aria-label="Main navigation"]');
    await expect(nav).toBeVisible();

    const closeButton = page.locator('button[aria-label="Close menu"]');
    await closeButton.click();

    // Menu should slide away (translate-x-full makes it invisible)
    await expect(nav).toHaveClass(/translate-x-full/);
  });
});
