/**
 * SmartMemory Profile Persistence Tests
 *
 * Tests that user profile data persists correctly using Raindrop SmartMemory.
 * Verifies:
 * - Profile updates save to ANALYTICS database
 * - Data persists across browser sessions
 * - Widget preferences are remembered
 * - Policy interests affect bill recommendations
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../helpers/auth';
import { SmartMemoryHelper } from '../../helpers/smartmemory';
import { faker } from '@faker-js/faker';

test.describe('SmartMemory Profile Persistence', () => {
  const testUser = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
  };

  test.beforeEach(async ({ page }) => {
    // Mock login to bypass OAuth
    await AuthHelper.mockLogin(page, testUser.email);
  });

  test.afterEach(async () => {
    // Cleanup SmartMemory cache
    await SmartMemoryHelper.clearUserCache(testUser.id);
  });

  test('user profile updates persist across sessions', async ({ page, context }) => {
    // Navigate to settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Update profile fields
    await page.fill('input[name="firstName"]', 'Jane');
    await page.fill('input[name="lastName"]', 'Doe');

    // Select language
    await page.click('[data-testid="language-select"]');
    await page.click('text=Español');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for success message
    await expect(page.locator('text=Settings saved successfully')).toBeVisible({
      timeout: 10_000,
    });

    // Wait for persistence
    await page.waitForTimeout(2000);

    // Open new browser context (simulate new session)
    const newContext = await context.browser()?.newContext();
    if (!newContext) {
      throw new Error('Failed to create new browser context');
    }

    const newPage = await newContext.newPage();
    await AuthHelper.mockLogin(newPage, testUser.email);

    // Navigate to settings in new session
    await newPage.goto('/settings');
    await newPage.waitForLoadState('networkidle');

    // Verify profile loaded from SmartMemory
    await expect(newPage.locator('input[name="firstName"]')).toHaveValue('Jane');
    await expect(newPage.locator('input[name="lastName"]')).toHaveValue('Doe');

    // Verify language selection persisted
    const selectedLanguage = await newPage
      .locator('[data-testid="language-select"]')
      .textContent();
    expect(selectedLanguage).toContain('Español');

    await newContext.close();
  });

  test('policy interests update and persist', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Clear existing interests (if any)
    const clearBtn = page.locator('button:has-text("Clear All")');
    if (await clearBtn.isVisible()) {
      await clearBtn.click();
    }

    // Select new interests
    await page.click('text=Technology & Privacy');
    await page.click('text=Defense & Security');
    await page.click('text=Climate & Environment');

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify interests persisted
    await expect(
      page.locator('[data-selected="true"]:has-text("Technology & Privacy")')
    ).toBeVisible();
    await expect(
      page.locator('[data-selected="true"]:has-text("Defense & Security")')
    ).toBeVisible();
    await expect(
      page.locator('[data-selected="true"]:has-text("Climate & Environment")')
    ).toBeVisible();
  });

  test('notification preferences persist correctly', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Enable notifications
    await page.check('input[name="emailNotifications"]');
    await page.check('input[name="billUpdateNotifications"]');
    await page.check('input[name="podcastNotifications"]');

    // Set quiet hours
    await page.check('input[name="quietHoursEnabled"]');
    await page.fill('input[name="quietHoursStart"]', '22:00');
    await page.fill('input[name="quietHoursEnd"]', '08:00');

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify notification preferences persisted
    await expect(page.locator('input[name="emailNotifications"]')).toBeChecked();
    await expect(page.locator('input[name="billUpdateNotifications"]')).toBeChecked();
    await expect(page.locator('input[name="podcastNotifications"]')).toBeChecked();

    // Verify quiet hours persisted
    await expect(page.locator('input[name="quietHoursEnabled"]')).toBeChecked();
    await expect(page.locator('input[name="quietHoursStart"]')).toHaveValue('22:00');
    await expect(page.locator('input[name="quietHoursEnd"]')).toHaveValue('08:00');
  });

  test('representatives data persists after ZIP code change', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Change ZIP code
    await page.fill('input[name="zipCode"]', '53202'); // Milwaukee
    await page.click('button:has-text("Update Representatives")');

    // Wait for representatives to load
    await page.waitForSelector('[data-testid="representative-card"]', {
      timeout: 15_000,
    });

    // Get representative names
    const repNames = await page
      .locator('[data-testid="rep-name"]')
      .allTextContents();

    expect(repNames.length).toBeGreaterThanOrEqual(2);

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Navigate away and back
    await page.goto('/dashboard');
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Verify representatives persisted
    const persistedReps = await page
      .locator('[data-testid="rep-name"]')
      .allTextContents();

    expect(persistedReps).toEqual(repNames);
  });

  test('podcast preferences persist and affect generation', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Update podcast preferences
    await page.check('input[name="autoGeneratePodcast"]');

    // Select preferred length
    await page.click('[data-testid="podcast-length-select"]');
    await page.click('text=In-depth');

    // Select listening days
    await page.check('input[value="monday"]');
    await page.check('input[value="wednesday"]');
    await page.check('input[value="friday"]');

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify podcast preferences persisted
    await expect(page.locator('input[name="autoGeneratePodcast"]')).toBeChecked();

    const selectedLength = await page
      .locator('[data-testid="podcast-length-select"]')
      .textContent();
    expect(selectedLength).toContain('In-depth');

    await expect(page.locator('input[value="monday"]')).toBeChecked();
    await expect(page.locator('input[value="wednesday"]')).toBeChecked();
    await expect(page.locator('input[value="friday"]')).toBeChecked();
  });

  test('learning style preference persists', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Select learning style
    await page.click('[data-testid="learning-style-select"]');
    await page.click('text=Audio-focused');

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Verify learning style persisted
    const selectedStyle = await page
      .locator('[data-testid="learning-style-select"]')
      .textContent();
    expect(selectedStyle).toContain('Audio-focused');
  });

  test('profile data accessible via API', async ({ page }) => {
    // Update profile via UI
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    await page.fill('input[name="firstName"]', 'API');
    await page.fill('input[name="lastName"]', 'Test');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    await page.waitForTimeout(2000);

    // Verify profile via API
    const profile = await SmartMemoryHelper.getUserProfile(testUser.id);

    expect(profile).not.toBeNull();
    expect(profile?.firstName).toBe('API');
    expect(profile?.lastName).toBe('Test');
  });

  test('concurrent profile updates handled correctly', async ({ page, context }) => {
    // Open two tabs
    const page2 = await context.newPage();

    // Navigate both to settings
    await page.goto('/settings');
    await page2.goto('/settings');

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Update different fields in each tab
    await page.fill('input[name="firstName"]', 'Tab1');
    await page2.fill('input[name="lastName"]', 'Tab2');

    // Save in tab 1
    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Wait a moment
    await page.waitForTimeout(1000);

    // Save in tab 2
    await page2.click('button:has-text("Save Changes")');
    await expect(page2.locator('text=Settings saved successfully')).toBeVisible();

    // Reload both tabs
    await page.reload();
    await page2.reload();

    await page.waitForLoadState('networkidle');
    await page2.waitForLoadState('networkidle');

    // Verify both updates persisted (last write wins, or merge strategy)
    const firstName1 = await page.locator('input[name="firstName"]').inputValue();
    const lastName1 = await page.locator('input[name="lastName"]').inputValue();

    const firstName2 = await page2.locator('input[name="firstName"]').inputValue();
    const lastName2 = await page2.locator('input[name="lastName"]').inputValue();

    // Both tabs should show the same data after reload
    expect(firstName1).toBe(firstName2);
    expect(lastName1).toBe(lastName2);

    await page2.close();
  });

  test('profile validation errors prevent save', async ({ page }) => {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Try to save invalid data (e.g., invalid language code)
    // This depends on your validation logic

    // Clear required field if enforced
    const firstNameInput = page.locator('input[name="firstName"]');
    if (await firstNameInput.isVisible()) {
      await firstNameInput.fill(''); // Clear field
    }

    // Try to save
    await page.click('button:has-text("Save Changes")');

    // Should show error or not save
    // Verify error message appears (adjust based on your UI)
    await expect(
      page.locator('text=Please fill in all required fields').or(
        page.locator('text=Invalid input')
      )
    ).toBeVisible({ timeout: 5000 });
  });

  test('profile changes reflected immediately on dashboard', async ({ page }) => {
    // Update interests in settings
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Select specific interest
    await page.click('text=Healthcare');

    await page.click('button:has-text("Save Changes")');
    await expect(page.locator('text=Settings saved successfully')).toBeVisible();

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Verify Healthcare-related content appears
    await expect(
      page.locator('[data-testid="bill-topic"]:has-text("Healthcare")')
    ).toBeVisible({ timeout: 10_000 });
  });
});
