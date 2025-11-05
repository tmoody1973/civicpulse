/**
 * Smoke Test
 *
 * Verifies that the testing infrastructure is working correctly:
 * - Playwright can load the app
 * - MailSlurp can create inboxes
 * - Basic navigation works
 * - Helper utilities function correctly
 */

import { test, expect } from '@playwright/test';
import { EmailTestHelper } from '../helpers/mailslurp';

test.describe('Smoke Tests', () => {
  test('app loads successfully', async ({ page }) => {
    // Navigate to homepage
    await page.goto('/');

    // Verify page loads
    await expect(page).toHaveTitle(/HakiVo/);

    // Verify main heading is visible
    await expect(
      page.getByRole('heading', { name: 'Know What Congress Is Doing' })
    ).toBeVisible();
  });

  test('MailSlurp can create and delete inbox', async () => {
    // Create test inbox
    const inbox = await EmailTestHelper.createInbox();

    // Verify inbox has valid email
    expect(inbox.email).toMatch(/@mailslurp/);
    expect(inbox.id).toBeTruthy();

    // Cleanup
    await EmailTestHelper.deleteInbox(inbox.id);
  });

  test('can navigate to key pages', async ({ page }) => {
    // Homepage
    await page.goto('/');
    await expect(page).toHaveURL('/');

    // Dashboard (should redirect to login if not authenticated)
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Should be on dashboard or login page
    const url = page.url();
    expect(url).toMatch(/\/(dashboard|login)/);
  });

  test('settings page loads', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Should redirect to login if not authenticated
    const url = page.url();
    expect(url).toMatch(/\/(settings|login)/);
  });

  test('API health check', async () => {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

    // Check if dev server is running
    const response = await fetch(baseUrl);
    expect(response.ok).toBe(true);
  });
});
