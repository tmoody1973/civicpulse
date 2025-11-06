/**
 * Authentication Test Helper
 *
 * Provides utilities for authentication in E2E tests.
 * Supports both mock login (bypass OAuth) and full OAuth flow.
 */

import { Page } from '@playwright/test';
import { EmailTestHelper } from './mailslurp';

export class AuthHelper {
  /**
   * Mock WorkOS OAuth login for testing (bypass OAuth flow)
   *
   * Sets session cookie directly to skip OAuth redirect flow.
   * Use this for most tests to speed up execution.
   *
   * @param page - Playwright page object
   * @param email - Test user email
   *
   * @example
   * test.beforeEach(async ({ page }) => {
   *   await AuthHelper.mockLogin(page, 'test@example.com');
   * });
   */
  static async mockLogin(page: Page, email: string): Promise<void> {
    // Create test session token via API
    const sessionToken = await this.createTestSession(email);

    // Set session cookie (must match lib/auth/session.ts)
    await page.context().addCookies([
      {
        name: 'civic_pulse_session',
        value: sessionToken,
        domain: 'localhost',
        path: '/',
        httpOnly: true,
        secure: false,
        sameSite: 'Lax',
      },
    ]);
  }

  /**
   * Create test session token
   *
   * Calls internal test API to create a valid session token.
   * This bypasses OAuth but creates a real user session.
   *
   * @param email - User email
   * @returns Session token (JWT)
   */
  private static async createTestSession(email: string): Promise<string> {
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/test/create-session`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    if (!response.ok) {
      throw new Error(`Failed to create test session: ${response.statusText}`);
    }

    const { sessionToken } = await response.json();

    if (!sessionToken) {
      throw new Error('No session token returned from API');
    }

    return sessionToken;
  }

  /**
   * Complete full OAuth flow with email verification
   *
   * Use this when testing the complete onboarding/login flow.
   * Requires MailSlurp inbox for email verification.
   *
   * @param page - Playwright page object
   * @param email - Test user email (MailSlurp inbox)
   * @param inboxId - MailSlurp inbox ID
   *
   * @example
   * const inbox = await EmailTestHelper.createInbox();
   * await AuthHelper.loginWithEmail(page, inbox.email, inbox.id);
   */
  static async loginWithEmail(
    page: Page,
    email: string,
    inboxId: string
  ): Promise<void> {
    // Navigate to login page
    await page.goto('/login');

    // Click Google OAuth button
    await page.click('button:has-text("Continue with Google")');

    // WorkOS redirects to email verification
    await page.waitForURL(/workos\.com/, { timeout: 10_000 });

    // Fill in email
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');

    // Wait for verification email
    const { verificationLink } = await EmailTestHelper.waitForVerificationEmail(
      inboxId,
      90_000 // 90 second timeout for OAuth flow
    );

    // Click verification link
    await page.goto(verificationLink);

    // Should redirect back to app dashboard
    await page.waitForURL(/dashboard/, { timeout: 30_000 });
  }

  /**
   * Check if user is authenticated
   *
   * @param page - Playwright page object
   * @returns True if authenticated
   *
   * @example
   * const isAuth = await AuthHelper.isAuthenticated(page);
   * expect(isAuth).toBe(true);
   */
  static async isAuthenticated(page: Page): Promise<boolean> {
    // Check for session cookie (must match lib/auth/session.ts)
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'civic_pulse_session');

    if (!sessionCookie) {
      return false;
    }

    // Verify session is valid by checking API
    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        Cookie: `civic_pulse_session=${sessionCookie.value}`,
      },
    });

    return response.ok;
  }

  /**
   * Logout user (clear session)
   *
   * @param page - Playwright page object
   *
   * @example
   * await AuthHelper.logout(page);
   * await page.goto('/dashboard'); // Should redirect to login
   */
  static async logout(page: Page): Promise<void> {
    // Clear all cookies
    await page.context().clearCookies();

    // Navigate to logout endpoint
    await page.goto('/api/auth/logout');
  }

  /**
   * Get current user data from session
   *
   * @param page - Playwright page object
   * @returns User object or null
   *
   * @example
   * const user = await AuthHelper.getCurrentUser(page);
   * expect(user.email).toBe('test@example.com');
   */
  static async getCurrentUser(page: Page): Promise<any | null> {
    const cookies = await page.context().cookies();
    const sessionCookie = cookies.find((c) => c.name === 'civic_pulse_session');

    if (!sessionCookie) {
      return null;
    }

    const baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3000';

    const response = await fetch(`${baseUrl}/api/auth/session`, {
      headers: {
        Cookie: `civic_pulse_session=${sessionCookie.value}`,
      },
    });

    if (!response.ok) {
      return null;
    }

    const data = await response.json();
    return data.user || null;
  }
}
