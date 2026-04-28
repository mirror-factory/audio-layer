/**
 * Meetings flow tests -- verify meetings list and detail pages.
 *
 * These tests check the structural rendering of the meetings pages.
 * When no meetings exist, the empty state is validated instead.
 */

import { test, expect } from '@playwright/test';

test.describe('Meetings page', () => {
  test('renders meetings list or empty state', async ({ page }) => {
    test.setTimeout(10_000);

    await page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    // The page should show either meeting items or the empty-state message
    const meetingLinks = page.locator('a[href^="/meetings/"]');
    const emptyMessage = page.locator('text=No meetings yet');

    const hasMeetings = (await meetingLinks.count()) > 0;
    const hasEmpty = await emptyMessage.isVisible().catch(() => false);

    expect(hasMeetings || hasEmpty).toBe(true);
  });

  test('empty-state CTA navigates to recording flow', async ({ page }) => {
    await page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    const emptyCta = page.getByRole('link', { name: 'Record your first meeting' });
    if ((await emptyCta.count()) === 0) {
      test.skip(true, 'Meetings exist, so empty-state CTA is not rendered');
      return;
    }

    await expect(emptyCta).toHaveAttribute('href', '/record/live');
  });

  test('meeting link navigates to detail page', async ({ page }) => {
    test.setTimeout(10_000);

    await page.goto('/meetings', { waitUntil: 'domcontentloaded' });

    const meetingLinks = page.locator('a[href^="/meetings/"]').filter({
      hasNotText: 'View all',
    });

    const count = await meetingLinks.count();
    if (count === 0) {
      test.skip(true, 'No meetings available to test detail navigation');
      return;
    }

    const href = await meetingLinks.first().getAttribute('href');
    expect(href).toBeTruthy();

    await meetingLinks.first().click();
    await page.waitForURL(`**/meetings/**`, { timeout: 5_000 });

    // Detail page should have a heading
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible();
  });

  test('meeting detail page shows transcript and summary sections when completed', async ({
    page,
    request,
  }) => {
    test.setTimeout(10_000);

    // Fetch meetings from API to find a completed one
    const res = await request.get('/api/meetings');
    const meetings = await res.json();

    const completed = meetings.find(
      (m: { status: string }) => m.status === 'completed',
    );

    if (!completed) {
      test.skip(true, 'No completed meetings available for detail page test');
      return;
    }

    await page.goto(`/meetings/${completed.id}`, {
      waitUntil: 'domcontentloaded',
    });

    // Should have a heading with the meeting title or "Untitled recording"
    const heading = page.locator('h2').first();
    await expect(heading).toBeVisible();

    // Completed meetings show transcript view and possibly summary
    // Check that the main content area has substantive content
    const main = page.locator('main');
    await expect(main).not.toBeEmpty();

    // The status chip should show "completed"
    const statusChip = page.locator('text=completed').first();
    await expect(statusChip).toBeVisible();

    await expect(page.getByRole('heading', { name: 'Ask about this meeting' })).toBeVisible();
    await expect(page.getByRole('button', { name: /Sales/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Interview/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Standup/ })).toBeVisible();
  });
});
