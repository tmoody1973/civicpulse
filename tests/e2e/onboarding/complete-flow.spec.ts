/**
 * Onboarding Flow Tests
 *
 * Tests the complete user onboarding experience:
 * 1. Email verification (optional - can use mock auth for speed)
 * 2. ZIP code lookup for representatives
 * 3. Policy interest selection
 * 4. Notification preferences
 * 5. Dashboard redirect
 */

import { test, expect } from '@playwright/test';
import { EmailTestHelper } from '../../helpers/mailslurp';
import { faker } from '@faker-js/faker';

test.describe('Onboarding Flow', () => {
  let inbox: { id: string; email: string };

  test.beforeEach(async () => {
    // Create temporary test inbox for email verification
    inbox = await EmailTestHelper.createInbox();
  });

  test.afterEach(async () => {
    // Cleanup
    if (inbox?.id) {
      await EmailTestHelper.deleteInbox(inbox.id);
    }
  });

  test('complete onboarding with ZIP code and interests', async ({ page }) => {
    // Navigate to onboarding page
    await page.goto('/onboarding');

    // Step 1: Enter ZIP code
    await page.waitForSelector('text=Enter your ZIP code', { timeout: 10_000 });

    // Enter Milwaukee ZIP code
    await page.fill('input[name="zipCode"]', '53202');
    await page.click('button:has-text("Find My Representatives")');

    // Wait for representatives to load
    await page.waitForSelector('text=Your Representatives', { timeout: 15_000 });

    // Verify we have representatives displayed
    const repCards = await page.locator('[data-testid="representative-card"]').count();
    expect(repCards).toBeGreaterThanOrEqual(2); // At least 2 senators

    // Verify representative names are displayed
    await expect(page.locator('[data-testid="rep-name"]').first()).toBeVisible();

    // Continue to interests
    await page.click('button:has-text("Continue")');

    // Step 2: Select policy interests
    await page.waitForSelector('text=What issues interest you?', { timeout: 10_000 });

    // Select 3 interests
    await page.click('text=Healthcare');
    await page.click('text=Climate & Environment');
    await page.click('text=Education');

    // Verify interests are selected (have active styling)
    const healthcareBtn = page.locator('button:has-text("Healthcare")');
    await expect(healthcareBtn).toHaveClass(/bg-primary|ring-2/); // Has active state

    // Continue to notification preferences
    await page.click('button:has-text("Continue")');

    // Step 3: Notification preferences
    await page.waitForSelector('text=How would you like to stay updated?', {
      timeout: 10_000,
    });

    // Enable email notifications
    await page.check('input[name="emailNotifications"]');

    // Enable podcast notifications
    await page.check('input[name="podcastNotifications"]');

    // Complete onboarding
    await page.click('button:has-text("Complete Setup")');

    // Step 4: Verify redirect to dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 15_000 });

    // Verify dashboard loads with user data
    await expect(page.locator('text=Your Representatives')).toBeVisible();

    // Verify selected interests appear on dashboard
    await expect(page.locator('text=Healthcare')).toBeVisible();
  });

  test('ZIP code lookup finds correct representatives', async ({ page }) => {
    await page.goto('/onboarding');

    // Enter different ZIP codes and verify correct representatives

    // Test 1: Milwaukee, WI (53202)
    await page.fill('input[name="zipCode"]', '53202');
    await page.click('button:has-text("Find My Representatives")');

    await page.waitForSelector('[data-testid="representative-card"]', {
      timeout: 15_000,
    });

    // Verify Wisconsin senators appear
    const wisconsinReps = await page.locator('[data-testid="rep-state"]').allTextContents();
    expect(wisconsinReps.some((state) => state.includes('WI'))).toBe(true);

    // Test 2: Change ZIP code (e.g., New York)
    await page.click('button:has-text("Change ZIP Code")');
    await page.fill('input[name="zipCode"]', '10001');
    await page.click('button:has-text("Find My Representatives")');

    await page.waitForTimeout(2000); // Wait for update

    // Verify New York representatives appear
    const nyReps = await page.locator('[data-testid="rep-state"]').allTextContents();
    expect(nyReps.some((state) => state.includes('NY'))).toBe(true);
  });

  test('can select and deselect policy interests', async ({ page }) => {
    await page.goto('/onboarding');

    // Skip to interests step (if ZIP code step exists)
    const zipInput = page.locator('input[name="zipCode"]');
    if (await zipInput.isVisible()) {
      await zipInput.fill('53202');
      await page.click('button:has-text("Find My Representatives")');
      await page.waitForSelector('[data-testid="representative-card"]');
      await page.click('button:has-text("Continue")');
    }

    // Wait for interests page
    await page.waitForSelector('text=What issues interest you?');

    // Select multiple interests
    await page.click('text=Healthcare');
    await page.click('text=Education');
    await page.click('text=Technology & Privacy');

    // Verify 3 interests selected
    let selectedCount = await page
      .locator('[data-selected="true"]')
      .count();
    expect(selectedCount).toBe(3);

    // Deselect one interest
    await page.click('text=Education');

    // Verify 2 interests selected
    selectedCount = await page.locator('[data-selected="true"]').count();
    expect(selectedCount).toBe(2);

    // Try to continue without minimum required interests (if enforced)
    const continueBtn = page.locator('button:has-text("Continue")');
    if (await continueBtn.isDisabled()) {
      // Select more interests if minimum required
      await page.click('text=Climate & Environment');
    }

    await continueBtn.click();

    // Verify moved to next step
    await expect(page.locator('text=How would you like to stay updated?')).toBeVisible();
  });

  test('notification preferences can be toggled', async ({ page }) => {
    await page.goto('/onboarding');

    // Skip to notification preferences step
    const zipInput = page.locator('input[name="zipCode"]');
    if (await zipInput.isVisible()) {
      await zipInput.fill('53202');
      await page.click('button:has-text("Find My Representatives")');
      await page.waitForSelector('[data-testid="representative-card"]');
      await page.click('button:has-text("Continue")');
    }

    // Select interests
    await page.waitForSelector('text=What issues interest you?');
    await page.click('text=Healthcare');
    await page.click('text=Education');
    await page.click('button:has-text("Continue")');

    // Wait for notification preferences
    await page.waitForSelector('text=How would you like to stay updated?');

    // Toggle email notifications
    const emailCheckbox = page.locator('input[name="emailNotifications"]');
    await emailCheckbox.check();
    await expect(emailCheckbox).toBeChecked();

    await emailCheckbox.uncheck();
    await expect(emailCheckbox).not.toBeChecked();

    // Toggle podcast notifications
    const podcastCheckbox = page.locator('input[name="podcastNotifications"]');
    await podcastCheckbox.check();
    await expect(podcastCheckbox).toBeChecked();

    // Complete setup with selected preferences
    await page.click('button:has-text("Complete Setup")');

    // Verify redirected to dashboard
    await page.waitForURL(/\/dashboard/);
  });

  test('validates ZIP code format', async ({ page }) => {
    await page.goto('/onboarding');

    await page.waitForSelector('input[name="zipCode"]');

    // Test invalid ZIP codes
    await page.fill('input[name="zipCode"]', '123'); // Too short
    await page.click('button:has-text("Find My Representatives")');

    // Should show error message
    await expect(page.locator('text=Invalid ZIP code')).toBeVisible({
      timeout: 5000,
    });

    // Test valid ZIP code
    await page.fill('input[name="zipCode"]', '53202');
    await page.click('button:has-text("Find My Representatives")');

    // Should not show error
    await expect(page.locator('text=Invalid ZIP code')).not.toBeVisible();

    // Should load representatives
    await page.waitForSelector('[data-testid="representative-card"]');
  });

  test('displays loading states during ZIP lookup', async ({ page }) => {
    await page.goto('/onboarding');

    await page.fill('input[name="zipCode"]', '53202');

    // Click submit button
    const submitBtn = page.locator('button:has-text("Find My Representatives")');
    await submitBtn.click();

    // Should show loading state
    await expect(
      page.locator('text=Finding your representatives...').or(submitBtn.locator('svg')) // Spinner icon
    ).toBeVisible({ timeout: 5000 });

    // Wait for results
    await page.waitForSelector('[data-testid="representative-card"]');

    // Loading state should disappear
    await expect(page.locator('text=Finding your representatives...')).not.toBeVisible();
  });

  test('handles ZIP code API errors gracefully', async ({ page }) => {
    await page.goto('/onboarding');

    // Enter ZIP code that might cause API error (e.g., non-existent)
    await page.fill('input[name="zipCode"]', '00000');
    await page.click('button:has-text("Find My Representatives")');

    // Wait for error message
    await expect(
      page.locator('text=Unable to find representatives').or(
        page.locator('text=Please try again')
      )
    ).toBeVisible({ timeout: 15_000 });

    // Verify user can retry
    const retryBtn = page.locator('button:has-text("Try Again")');
    if (await retryBtn.isVisible()) {
      await retryBtn.click();
      await expect(page.locator('input[name="zipCode"]')).toBeVisible();
    }
  });

  test('mobile viewport: onboarding flow works on small screens', async ({ page }) => {
    // Set mobile viewport (iPhone SE)
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/onboarding');

    // Verify ZIP code input is visible and usable on mobile
    const zipInput = page.locator('input[name="zipCode"]');
    await expect(zipInput).toBeVisible();

    // Verify input is large enough for mobile (44px touch target)
    const inputBox = await zipInput.boundingBox();
    expect(inputBox?.height).toBeGreaterThanOrEqual(44);

    await zipInput.fill('53202');
    await page.click('button:has-text("Find My Representatives")');

    // Wait for representatives
    await page.waitForSelector('[data-testid="representative-card"]');

    // Verify cards are stacked vertically on mobile
    const firstCard = page.locator('[data-testid="representative-card"]').first();
    const firstCardBox = await firstCard.boundingBox();

    expect(firstCardBox?.width).toBeLessThan(375); // Not full width due to padding

    // Continue through flow
    await page.click('button:has-text("Continue")');

    // Verify interest selection works on mobile
    await page.waitForSelector('text=What issues interest you?');

    const interestBtn = page.locator('text=Healthcare');
    await expect(interestBtn).toBeVisible();

    const btnBox = await interestBtn.boundingBox();
    expect(btnBox?.height).toBeGreaterThanOrEqual(44); // Touch target size

    await interestBtn.click();
  });
});
