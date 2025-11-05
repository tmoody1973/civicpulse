/**
 * SmartMemory Test Helper
 *
 * Provides utilities for testing Raindrop SmartMemory features.
 * Tests user preferences, widget settings, and data persistence.
 */

import { Page, expect } from '@playwright/test';

export interface UserProfile {
  userId: string;
  firstName?: string;
  lastName?: string;
  preferredLanguage: string;
  policyInterests: string[];
  representatives: any[];
  location: any;
  notificationPreferences: any;
  podcastPreferences: any;
  learningStyle: string;
}

export class SmartMemoryHelper {
  /**
   * Get user profile from SmartMemory via Raindrop API
   *
   * @param userId - User ID
   * @returns User profile object
   *
   * @example
   * const profile = await SmartMemoryHelper.getUserProfile('user-123');
   * expect(profile.preferredLanguage).toBe('en');
   */
  static async getUserProfile(userId: string): Promise<UserProfile | null> {
    const serviceUrl =
      process.env.TEST_RAINDROP_SERVICE_URL ||
      'https://hakivo-preferences.raindrop.app';

    const response = await fetch(
      `${serviceUrl}/api/preferences/profile?userId=${userId}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.profile || null;
  }

  /**
   * Update user profile via API
   *
   * @param userId - User ID
   * @param updates - Profile fields to update
   * @returns Updated profile
   *
   * @example
   * const profile = await SmartMemoryHelper.updateUserProfile('user-123', {
   *   firstName: 'Jane',
   *   preferredLanguage: 'es',
   * });
   */
  static async updateUserProfile(
    userId: string,
    updates: Partial<UserProfile>
  ): Promise<UserProfile> {
    const serviceUrl =
      process.env.TEST_RAINDROP_SERVICE_URL ||
      'https://hakivo-preferences.raindrop.app';

    const response = await fetch(`${serviceUrl}/api/preferences/profile`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        updates,
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to update profile: ${response.statusText}`);
    }

    const data = await response.json();
    return data.profile;
  }

  /**
   * Update profile via UI and verify persistence
   *
   * @param page - Playwright page object
   * @param userId - User ID
   * @param updates - Profile fields to update
   * @returns Initial and updated profile
   *
   * @example
   * const { initial, updated } = await SmartMemoryHelper.updateAndVerifyProfile(
   *   page,
   *   'user-123',
   *   { firstName: 'Jane', lastName: 'Doe' }
   * );
   */
  static async updateAndVerifyProfile(
    page: Page,
    userId: string,
    updates: Record<string, any>
  ): Promise<{
    initial: UserProfile | null;
    updated: UserProfile | null;
  }> {
    // Get initial profile
    const initialProfile = await this.getUserProfile(userId);

    // Navigate to settings page
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Fill in form fields
    for (const [field, value] of Object.entries(updates)) {
      const input = page.locator(`[name="${field}"]`);

      if (await input.isVisible()) {
        await input.fill(String(value));
      }
    }

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Wait for success message
    await expect(
      page.locator('text=Settings saved successfully')
    ).toBeVisible({ timeout: 10_000 });

    // Wait for API to persist changes
    await page.waitForTimeout(2000);

    // Get updated profile from SmartMemory
    const updatedProfile = await this.getUserProfile(userId);

    return {
      initial: initialProfile,
      updated: updatedProfile,
    };
  }

  /**
   * Test widget preferences persistence
   *
   * @param page - Playwright page object
   * @param userId - User ID
   * @param widgetName - Widget data-widget attribute value
   * @returns True if widget stays hidden after reload
   *
   * @example
   * const persisted = await SmartMemoryHelper.testWidgetPersistence(
   *   page,
   *   'user-123',
   *   'legislation'
   * );
   * expect(persisted).toBe(true);
   */
  static async testWidgetPersistence(
    page: Page,
    userId: string,
    widgetName: string
  ): Promise<boolean> {
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Check if widget is initially visible
    const widgetSelector = `[data-widget="${widgetName}"]`;
    const initiallyVisible = await page.isVisible(widgetSelector);

    if (initiallyVisible) {
      // Hide the widget
      const hideButton = page.locator(
        `${widgetSelector} button[aria-label*="Hide"]`
      );
      await hideButton.click();

      // Wait for save
      await page.waitForTimeout(2000);
    }

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Check if widget is still hidden
    const stillHidden = !(await page.isVisible(widgetSelector));

    return stillHidden;
  }

  /**
   * Clear SmartMemory cache for user (test cleanup)
   *
   * @param userId - User ID
   *
   * @example
   * test.afterEach(async () => {
   *   await SmartMemoryHelper.clearUserCache('user-123');
   * });
   */
  static async clearUserCache(userId: string): Promise<void> {
    const serviceUrl =
      process.env.TEST_RAINDROP_SERVICE_URL ||
      'https://hakivo-preferences.raindrop.app';

    await fetch(`${serviceUrl}/api/test/clear-cache`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
  }

  /**
   * Test policy interests affect bill recommendations
   *
   * @param page - Playwright page object
   * @param interests - Policy interests to test
   * @returns True if bill recommendations match interests
   *
   * @example
   * const matched = await SmartMemoryHelper.testInterestMatching(page, [
   *   'Technology & Privacy',
   *   'Defense & Security'
   * ]);
   * expect(matched).toBe(true);
   */
  static async testInterestMatching(
    page: Page,
    interests: string[]
  ): Promise<boolean> {
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    // Clear existing interests
    const clearButton = page.locator('button:has-text("Clear All")');
    if (await clearButton.isVisible()) {
      await clearButton.click();
    }

    // Select new interests
    for (const interest of interests) {
      await page.click(`text=${interest}`);
    }

    // Save changes
    await page.click('button:has-text("Save Changes")');
    await page.waitForSelector('text=Settings saved successfully');

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Wait for bill recommendations to load
    await page.waitForSelector('[data-testid="bill-card"]', { timeout: 10_000 });

    // Get bill topics
    const billTopics = await page
      .locator('[data-testid="bill-topic"]')
      .allTextContents();

    // Check if any bills match selected interests
    const hasRelevantTopics = billTopics.some((topic) =>
      interests.some((interest) => topic.includes(interest))
    );

    return hasRelevantTopics;
  }

  /**
   * Verify profile data persists across sessions
   *
   * @param page - Playwright page object
   * @param userId - User ID
   * @param expectedData - Expected profile data
   *
   * @example
   * await SmartMemoryHelper.verifyProfilePersistence(page, 'user-123', {
   *   firstName: 'Jane',
   *   preferredLanguage: 'es',
   * });
   */
  static async verifyProfilePersistence(
    page: Page,
    userId: string,
    expectedData: Record<string, any>
  ): Promise<void> {
    // Get profile from SmartMemory
    const profile = await this.getUserProfile(userId);

    // Verify each expected field
    for (const [key, value] of Object.entries(expectedData)) {
      const actualValue = (profile as any)?.[key];
      expect(actualValue).toBe(value);
    }

    // Also verify UI shows correct data
    await page.goto('/settings');
    await page.waitForLoadState('networkidle');

    for (const [key, value] of Object.entries(expectedData)) {
      const input = page.locator(`[name="${key}"]`);
      if (await input.isVisible()) {
        await expect(input).toHaveValue(String(value));
      }
    }
  }

  /**
   * Get widget preferences from SmartMemory
   *
   * @param userId - User ID
   * @returns Widget preferences object
   *
   * @example
   * const widgets = await SmartMemoryHelper.getWidgetPreferences('user-123');
   * expect(widgets['legislation'].isVisible).toBe(false);
   */
  static async getWidgetPreferences(userId: string): Promise<any> {
    const serviceUrl =
      process.env.TEST_RAINDROP_SERVICE_URL ||
      'https://hakivo-preferences.raindrop.app';

    const response = await fetch(
      `${serviceUrl}/api/preferences/widgets?userId=${userId}`
    );

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.widgets || null;
  }

  /**
   * Update widget preference via API
   *
   * @param userId - User ID
   * @param widgetType - Widget type
   * @param updates - Widget preference updates
   *
   * @example
   * await SmartMemoryHelper.updateWidgetPreference('user-123', 'legislation', {
   *   isVisible: false,
   *   position: 2,
   * });
   */
  static async updateWidgetPreference(
    userId: string,
    widgetType: string,
    updates: any
  ): Promise<void> {
    const serviceUrl =
      process.env.TEST_RAINDROP_SERVICE_URL ||
      'https://hakivo-preferences.raindrop.app';

    await fetch(`${serviceUrl}/api/preferences/widgets`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId,
        widgetType,
        updates,
      }),
    });
  }
}
