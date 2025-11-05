/**
 * Dashboard Widget Customization Tests
 *
 * Tests widget show/hide, reorder, and preference persistence.
 * Verifies that dashboard customization saves to SmartMemory.
 */

import { test, expect } from '@playwright/test';
import { AuthHelper } from '../../helpers/auth';
import { SmartMemoryHelper } from '../../helpers/smartmemory';
import { faker } from '@faker-js/faker';

test.describe('Dashboard Widget Customization', () => {
  const testUser = {
    id: faker.string.uuid(),
    email: faker.internet.email(),
  };

  test.beforeEach(async ({ page }) => {
    // Mock login
    await AuthHelper.mockLogin(page, testUser.email);

    // Navigate to dashboard
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
  });

  test.afterEach(async () => {
    // Cleanup
    await SmartMemoryHelper.clearUserCache(testUser.id);
  });

  test('can hide and show widgets', async ({ page }) => {
    // Verify legislation widget is visible
    const legislationWidget = page.locator('[data-widget="legislation"]');
    await expect(legislationWidget).toBeVisible();

    // Click hide button
    await legislationWidget
      .locator('button[aria-label*="Hide"]')
      .click();

    // Widget should disappear
    await expect(legislationWidget).not.toBeVisible({ timeout: 2000 });

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Widget should still be hidden
    await expect(legislationWidget).not.toBeVisible();

    // Show widget again
    await page.click('button:has-text("Customize Dashboard")');
    await page.check('input[data-widget="legislation"]');

    // Widget should reappear
    await expect(legislationWidget).toBeVisible({ timeout: 2000 });
  });

  test('widget visibility persists across sessions', async ({ page, context }) => {
    // Hide multiple widgets
    await page.locator('[data-widget="twitter"] button[aria-label*="Hide"]').click();
    await page.locator('[data-widget="news"] button[aria-label*="Hide"]').click();

    await page.waitForTimeout(2000); // Wait for save

    // Open new session
    const newContext = await context.browser()?.newContext();
    if (!newContext) throw new Error('Failed to create context');

    const newPage = await newContext.newPage();
    await AuthHelper.mockLogin(newPage, testUser.email);

    await newPage.goto('/dashboard');
    await newPage.waitForLoadState('networkidle');

    // Widgets should still be hidden
    await expect(newPage.locator('[data-widget="twitter"]')).not.toBeVisible();
    await expect(newPage.locator('[data-widget="news"]')).not.toBeVisible();

    await newContext.close();
  });

  test('can reorder widgets via drag and drop', async ({ page }) => {
    // Get initial order of widgets
    const initialOrder = await page
      .locator('[data-widget]')
      .evaluateAll((widgets) => widgets.map((w) => w.getAttribute('data-widget')));

    // Find legislation and podcast widgets
    const legislationWidget = page.locator('[data-widget="legislation"]');
    const podcastWidget = page.locator('[data-widget="podcast-queue"]');

    // Get initial positions
    const legislationBox = await legislationWidget.boundingBox();
    const podcastBox = await podcastWidget.boundingBox();

    if (!legislationBox || !podcastBox) {
      throw new Error('Widget bounding boxes not found');
    }

    // Drag legislation widget to podcast widget's position
    await legislationWidget.hover();
    await page.mouse.down();
    await page.mouse.move(podcastBox.x + 10, podcastBox.y + 10, { steps: 10 });
    await page.mouse.up();

    // Wait for reorder animation
    await page.waitForTimeout(1000);

    // Get new order
    const newOrder = await page
      .locator('[data-widget]')
      .evaluateAll((widgets) => widgets.map((w) => w.getAttribute('data-widget')));

    // Order should have changed
    expect(newOrder).not.toEqual(initialOrder);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // New order should persist
    const persistedOrder = await page
      .locator('[data-widget]')
      .evaluateAll((widgets) => widgets.map((w) => w.getAttribute('data-widget')));

    expect(persistedOrder).toEqual(newOrder);
  });

  test('customize dashboard modal works correctly', async ({ page }) => {
    // Open customize modal
    await page.click('button:has-text("Customize Dashboard")');

    // Modal should be visible
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.locator('text=Customize Your Dashboard')).toBeVisible();

    // All widgets should be listed
    await expect(page.locator('text=Legislation Tracker')).toBeVisible();
    await expect(page.locator('text=Twitter Feed')).toBeVisible();
    await expect(page.locator('text=News Updates')).toBeVisible();
    await expect(page.locator('text=Podcast Queue')).toBeVisible();

    // Toggle some widgets off
    await page.uncheck('input[data-widget="twitter"]');
    await page.uncheck('input[data-widget="news"]');

    // Save changes
    await page.click('button:has-text("Save Changes")');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Widgets should be hidden
    await expect(page.locator('[data-widget="twitter"]')).not.toBeVisible();
    await expect(page.locator('[data-widget="news"]')).not.toBeVisible();

    // Other widgets should still be visible
    await expect(page.locator('[data-widget="legislation"]')).toBeVisible();
    await expect(page.locator('[data-widget="podcast-queue"]')).toBeVisible();
  });

  test('widget preferences save via API', async ({ page }) => {
    // Hide a widget
    await page.locator('[data-widget="legislation"] button[aria-label*="Hide"]').click();

    await page.waitForTimeout(2000);

    // Check via API
    const widgets = await SmartMemoryHelper.getWidgetPreferences(testUser.id);

    expect(widgets).toBeTruthy();
    expect(widgets['legislation'].isVisible).toBe(false);
  });

  test('can reset widgets to default layout', async ({ page }) => {
    // Customize widgets (hide some)
    await page.locator('[data-widget="twitter"] button[aria-label*="Hide"]').click();
    await page.locator('[data-widget="news"] button[aria-label*="Hide"]').click();

    await page.waitForTimeout(1000);

    // Verify widgets are hidden
    await expect(page.locator('[data-widget="twitter"]')).not.toBeVisible();

    // Open customize modal
    await page.click('button:has-text("Customize Dashboard")');

    // Click reset to default
    await page.click('button:has-text("Reset to Default")');

    // Confirm reset
    await page.click('button:has-text("Confirm")');

    // Modal should close
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // All widgets should be visible again
    await expect(page.locator('[data-widget="twitter"]')).toBeVisible();
    await expect(page.locator('[data-widget="news"]')).toBeVisible();
    await expect(page.locator('[data-widget="legislation"]')).toBeVisible();
  });

  test('widget filter settings persist', async ({ page }) => {
    // Open legislation widget settings
    await page.locator('[data-widget="legislation"] button[aria-label*="Settings"]').click();

    // Filter by specific topic
    await page.click('text=Filter by Topic');
    await page.check('input[value="Healthcare"]');
    await page.check('input[value="Education"]');

    // Apply filters
    await page.click('button:has-text("Apply Filters")');

    // Wait for content to update
    await page.waitForTimeout(1000);

    // Verify filtered content
    const billTopics = await page
      .locator('[data-testid="bill-topic"]')
      .allTextContents();

    const hasOnlySelectedTopics = billTopics.every(
      (topic) => topic.includes('Healthcare') || topic.includes('Education')
    );

    expect(hasOnlySelectedTopics).toBe(true);

    // Reload page
    await page.reload();
    await page.waitForLoadState('networkidle');

    // Filters should persist
    const persistedTopics = await page
      .locator('[data-testid="bill-topic"]')
      .allTextContents();

    expect(persistedTopics).toEqual(billTopics);
  });

  test('mobile: widget customization works on small screens', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Open customize menu (might be in hamburger menu on mobile)
    const hamburgerMenu = page.locator('button[aria-label="Menu"]');
    if (await hamburgerMenu.isVisible()) {
      await hamburgerMenu.click();
    }

    await page.click('button:has-text("Customize Dashboard")');

    // Modal should be visible and usable on mobile
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Checkboxes should be large enough for touch
    const checkbox = page.locator('input[data-widget="twitter"]').first();
    const checkboxBox = await checkbox.boundingBox();

    expect(checkboxBox?.width).toBeGreaterThanOrEqual(44);
    expect(checkboxBox?.height).toBeGreaterThanOrEqual(44);

    // Toggle widget
    await checkbox.uncheck();

    // Save
    await page.click('button:has-text("Save Changes")');

    // Widget should be hidden
    await expect(page.locator('[data-widget="twitter"]')).not.toBeVisible();
  });

  test('widget empty states display correctly', async ({ page }) => {
    // Hide all widgets except one
    await page.click('button:has-text("Customize Dashboard")');

    await page.uncheck('input[data-widget="twitter"]');
    await page.uncheck('input[data-widget="news"]');
    await page.uncheck('input[data-widget="podcast-queue"]');
    await page.uncheck('input[data-widget="civic-impact"]');

    await page.click('button:has-text("Save Changes")');

    // Only legislation widget should be visible
    await expect(page.locator('[data-widget="legislation"]')).toBeVisible();

    // Other widgets should not exist in DOM
    await expect(page.locator('[data-widget="twitter"]')).not.toBeVisible();

    // If no widgets selected, show empty state
    await page.click('button:has-text("Customize Dashboard")');
    await page.uncheck('input[data-widget="legislation"]');
    await page.click('button:has-text("Save Changes")');

    // Empty state message should appear
    await expect(
      page.locator('text=No widgets selected').or(
        page.locator('text=Customize your dashboard')
      )
    ).toBeVisible();
  });

  test('widget loading states display correctly', async ({ page }) => {
    // Navigate to dashboard
    await page.goto('/dashboard');

    // Widgets should show loading skeletons initially
    await expect(
      page.locator('[data-testid="widget-skeleton"]').or(
        page.locator('[data-testid="loading-spinner"]')
      )
    ).toBeVisible({ timeout: 2000 });

    // Wait for data to load
    await page.waitForLoadState('networkidle');

    // Loading states should disappear
    await expect(page.locator('[data-testid="widget-skeleton"]')).not.toBeVisible({
      timeout: 10_000,
    });

    // Content should be visible
    await expect(page.locator('[data-widget="legislation"]')).toBeVisible();
  });

  test('widget error states display correctly', async ({ page }) => {
    // Simulate API error by blocking requests
    await page.route('**/api/bills/**', (route) => route.abort());

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Error state should appear in legislation widget
    await expect(
      page
        .locator('[data-widget="legislation"]')
        .locator('text=Unable to load').or(
          page.locator('[data-widget="legislation"]').locator('text=Error')
        )
    ).toBeVisible({ timeout: 10_000 });

    // Retry button should be available
    await expect(
      page.locator('[data-widget="legislation"] button:has-text("Retry")')
    ).toBeVisible();
  });
});
