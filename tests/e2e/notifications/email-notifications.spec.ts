/**
 * Email Notification Tests
 *
 * Tests email notifications using MailSlurp:
 * - Bill update notifications
 * - Podcast ready notifications
 * - Representative activity notifications
 * - Notification preferences (quiet hours, channels)
 */

import { test, expect } from '@playwright/test';
import { EmailTestHelper } from '../../helpers/mailslurp';
import { AuthHelper } from '../../helpers/auth';
import { faker } from '@faker-js/faker';

test.describe('Email Notifications', () => {
  let inbox: { id: string; email: string };

  test.beforeEach(async ({ page }) => {
    // Create test inbox
    inbox = await EmailTestHelper.createInbox();

    // Mock login with test email
    await AuthHelper.mockLogin(page, inbox.email);
  });

  test.afterEach(async () => {
    // Cleanup
    if (inbox?.id) {
      await EmailTestHelper.deleteInbox(inbox.id);
    }
  });

  test('user receives bill update notification email', async ({ page }) => {
    // Enable bill update notifications
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger bill update via test API
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-1234',
        billTitle: 'Healthcare Reform Act',
        updateType: 'status_change',
        newStatus: 'Passed House',
      }),
    });

    // Wait for notification email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Bill Update',
      90_000
    );

    // Verify email content
    expect(email.subject).toContain('Bill Update');
    expect(email.body).toContain('H.R. 1234');
    expect(email.body).toContain('Healthcare Reform Act');
    expect(email.body).toContain('Passed House');

    // Verify email has view bill link
    expect(email.body).toContain('View Bill');

    // Verify email has unsubscribe link
    expect(email.body).toContain('Unsubscribe');
  });

  test('user receives podcast ready notification', async ({ page }) => {
    // Enable podcast notifications
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="podcastNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger podcast generation via test API
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/generate-podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        type: 'daily',
        duration: 420, // 7 minutes
        billsCovered: ['hr-1234', 's-5678'],
      }),
    });

    // Wait for notification email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Your Daily Briefing is Ready',
      90_000
    );

    // Verify email content
    expect(email.subject).toContain('Daily Briefing');
    expect(email.body).toContain('daily briefing');
    expect(email.body).toContain('Listen Now');

    // Extract podcast link
    const links = await EmailTestHelper.extractLinks(inbox.id);
    const podcastLink = links.find((link) => link.includes('/podcast/'));

    expect(podcastLink).toBeTruthy();

    // Navigate to podcast link
    if (podcastLink) {
      await page.goto(podcastLink);
      await page.waitForLoadState('networkidle');

      // Verify audio player is visible
      await expect(page.locator('audio')).toBeVisible();
    }
  });

  test('quiet hours prevent email notifications', async ({ page }) => {
    const now = new Date();

    // Set quiet hours to current time (± 1 hour)
    const quietStart = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
    const quietEnd = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

    // Enable notifications with quiet hours
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    // Enable quiet hours
    await page.check('input[name="quietHoursEnabled"]');
    await page.fill(
      'input[name="quietHoursStart"]',
      quietStart.toTimeString().slice(0, 5)
    );
    await page.fill('input[name="quietHoursEnd"]', quietEnd.toTimeString().slice(0, 5));

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger notification during quiet hours
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-5678',
        updateType: 'new_vote',
      }),
    });

    // Verify no email received (should timeout)
    await expect(async () => {
      await EmailTestHelper.waitForNotificationEmail(
        inbox.id,
        'Bill Update',
        10_000 // Short timeout
      );
    }).rejects.toThrow();

    // Verify inbox is empty
    const emails = await EmailTestHelper.getAllEmails(inbox.id);
    expect(emails.length).toBe(0);
  });

  test('notification email has correct sender', async ({ page }) => {
    // Enable notifications
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger notification
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-1234',
      }),
    });

    // Wait for email
    const email = await EmailTestHelper.waitForEmailFrom(
      inbox.id,
      'notifications@hakivo.app',
      90_000
    );

    expect(email.from).toContain('hakivo');
  });

  test('unsubscribe link works correctly', async ({ page }) => {
    // Enable notifications
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger notification
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-1234',
      }),
    });

    // Wait for email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Bill Update',
      90_000
    );

    // Extract unsubscribe link
    const unsubscribeMatch = email.body?.match(/href="([^"]*unsubscribe[^"]*)"/i);
    expect(unsubscribeMatch).toBeTruthy();

    if (unsubscribeMatch) {
      const unsubscribeLink = unsubscribeMatch[1];

      // Click unsubscribe link
      await page.goto(unsubscribeLink);

      // Verify unsubscribe confirmation page
      await expect(
        page.locator('text=You have been unsubscribed').or(
          page.locator('text=Unsubscribe successful')
        )
      ).toBeVisible();

      // Verify notifications are now disabled in settings
      await page.goto('/settings');
      await page.waitForLoadState('networkidle');

      await expect(page.locator('input[name="billUpdateNotifications"]')).not.toBeChecked();
    }
  });

  test('multiple notification types can be enabled', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Enable all notification types
    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');
    await page.check('input[name="podcastNotifications"]');
    await page.check('input[name="representativeActivityNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

    // Trigger multiple notifications
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: inbox.email, billId: 'hr-1' }),
    });

    await fetch(`${baseUrl}/api/test/generate-podcast`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userEmail: inbox.email, type: 'daily' }),
    });

    // Wait for multiple emails
    const emails = await EmailTestHelper.waitForEmailCount(inbox.id, 2, 120_000);

    expect(emails.length).toBe(2);

    // Verify different notification types received
    const subjects = emails.map((e) => e.subject || '');
    expect(subjects.some((s) => s.includes('Bill'))).toBe(true);
    expect(subjects.some((s) => s.includes('Briefing'))).toBe(true);
  });

  test('email notifications contain personalized greeting', async ({ page }) => {
    // Set user name
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Doe');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger notification
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-1234',
      }),
    });

    // Wait for email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Bill Update',
      90_000
    );

    // Verify personalized greeting
    expect(email.body).toMatch(/Hi Jane|Hello Jane|Dear Jane/);
  });

  test('email notifications respect language preference', async ({ page }) => {
    // Set language to Spanish
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.click('[data-testid="language-select"]');
    await page.click('text=Español');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Trigger notification
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-1234',
      }),
    });

    // Wait for email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Actualización', // "Update" in Spanish
      90_000
    );

    // Verify Spanish content
    expect(email.body).toContain('proyecto de ley'); // "bill" in Spanish
  });

  test('email notification rate limiting works', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

    // Trigger many notifications rapidly
    for (let i = 0; i < 10; i++) {
      await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: inbox.email,
          billId: `hr-${i}`,
        }),
      });
    }

    // Wait and check email count
    await page.waitForTimeout(30_000); // Wait 30 seconds

    const emails = await EmailTestHelper.getAllEmails(inbox.id);

    // Should have received fewer than 10 emails due to rate limiting
    expect(emails.length).toBeLessThan(10);
    expect(emails.length).toBeGreaterThan(0);
  });

  test('email notification includes bill summary', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';
    await fetch(`${baseUrl}/api/test/trigger-bill-update`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userEmail: inbox.email,
        billId: 'hr-1234',
        billTitle: 'Healthcare Reform Act',
        summary: 'This bill expands healthcare coverage to all Americans.',
      }),
    });

    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Bill Update',
      90_000
    );

    // Verify summary is included
    expect(email.body).toContain('Healthcare Reform Act');
    expect(email.body).toContain('expands healthcare coverage');
  });
});
