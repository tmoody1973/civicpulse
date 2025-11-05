# HakiVo Testing Plan
## MailSlurp + Playwright Integration for User Flow Testing

**Goal:** Implement comprehensive automated testing for user flows, email notifications, and SmartMemory features.

---

## Architecture Overview

```
tests/
├── e2e/                          # End-to-end tests
│   ├── onboarding/
│   │   ├── email-verification.spec.ts
│   │   ├── zip-lookup.spec.ts
│   │   └── interest-selection.spec.ts
│   ├── dashboard/
│   │   ├── widget-customization.spec.ts
│   │   ├── preferences-update.spec.ts
│   │   └── representative-display.spec.ts
│   ├── notifications/
│   │   ├── bill-updates.spec.ts
│   │   ├── podcast-ready.spec.ts
│   │   └── notification-preferences.spec.ts
│   └── smartmemory/
│       ├── profile-persistence.spec.ts
│       ├── widget-preferences.spec.ts
│       └── cache-invalidation.spec.ts
├── fixtures/
│   ├── users.ts                  # Test user data
│   ├── bills.ts                  # Sample bill data
│   └── representatives.ts        # Sample rep data
├── helpers/
│   ├── mailslurp.ts              # Email testing utilities
│   ├── auth.ts                   # Authentication helpers
│   └── smartmemory.ts            # SmartMemory test helpers
└── playwright.config.ts          # Playwright configuration
```

---

## Phase 1: Setup & Dependencies

### 1.1 Install Dependencies

```bash
npm install -D @playwright/test
npm install -D mailslurp-client
npm install -D @faker-js/faker  # For generating test data
npm install -D dotenv            # For test environment variables
```

### 1.2 Environment Variables

Create `.env.test`:

```bash
# MailSlurp
MAILSLURP_API_KEY=your_mailslurp_api_key

# Test Environment
TEST_BASE_URL=http://localhost:3000
TEST_RAINDROP_SERVICE_URL=http://localhost:8787

# WorkOS (use test mode)
WORKOS_API_KEY=test_sk_...
WORKOS_CLIENT_ID=test_client_...

# Raindrop Test Database
RAINDROP_SQL_URL=test_database_url
RAINDROP_SMART_MEMORY_URL=test_smartmemory_url
```

### 1.3 Playwright Configuration

```typescript
// playwright.config.ts
import { defineConfig, devices } from '@playwright/test';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.test' });

export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',

  use: {
    baseURL: process.env.TEST_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },
    // Mobile testing
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'] },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
```

---

## Phase 2: Helper Utilities

### 2.1 MailSlurp Helper

```typescript
// tests/helpers/mailslurp.ts
import { MailSlurp } from 'mailslurp-client';

const mailslurp = new MailSlurp({ apiKey: process.env.MAILSLURP_API_KEY! });

export class EmailTestHelper {
  /**
   * Create a temporary test inbox
   */
  static async createInbox() {
    const inbox = await mailslurp.createInbox();
    return {
      id: inbox.id,
      email: inbox.emailAddress,
    };
  }

  /**
   * Wait for email and extract verification link
   */
  static async waitForVerificationEmail(inboxId: string, timeout = 60000) {
    const email = await mailslurp.waitForLatestEmail(inboxId, timeout);

    if (!email.body) {
      throw new Error('Email body is empty');
    }

    // Extract verification link from email body
    const linkMatch = email.body.match(/href="([^"]*verify[^"]*)"/);
    if (!linkMatch) {
      throw new Error('No verification link found in email');
    }

    return {
      email,
      verificationLink: linkMatch[1],
    };
  }

  /**
   * Wait for notification email (bill update, podcast ready, etc.)
   */
  static async waitForNotificationEmail(
    inboxId: string,
    subject: string,
    timeout = 60000
  ) {
    const email = await mailslurp.waitForMatchingEmails({
      inboxId,
      count: 1,
      timeout,
      matchOptions: {
        subject,
      },
    });

    return email[0];
  }

  /**
   * Verify email contains specific content
   */
  static async verifyEmailContent(
    inboxId: string,
    expectedContent: string[],
    timeout = 60000
  ) {
    const email = await mailslurp.waitForLatestEmail(inboxId, timeout);

    const missingContent = expectedContent.filter(
      content => !email.body?.includes(content)
    );

    if (missingContent.length > 0) {
      throw new Error(
        `Email missing expected content: ${missingContent.join(', ')}`
      );
    }

    return email;
  }

  /**
   * Delete test inbox (cleanup)
   */
  static async deleteInbox(inboxId: string) {
    await mailslurp.deleteInbox(inboxId);
  }
}
```

### 2.2 Authentication Helper

```typescript
// tests/helpers/auth.ts
import { Page } from '@playwright/test';

export class AuthHelper {
  /**
   * Mock WorkOS OAuth login for testing
   */
  static async mockLogin(page: Page, email: string) {
    // Set session cookie to bypass OAuth flow in tests
    await page.context().addCookies([{
      name: 'session',
      value: await this.createTestSession(email),
      domain: 'localhost',
      path: '/',
      httpOnly: true,
      secure: false,
      sameSite: 'Lax',
    }]);
  }

  /**
   * Create test session token
   */
  private static async createTestSession(email: string): Promise<string> {
    // Call test API endpoint to create session
    const response = await fetch('http://localhost:3000/api/test/create-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });

    const { sessionToken } = await response.json();
    return sessionToken;
  }

  /**
   * Complete full OAuth flow with MailSlurp
   */
  static async loginWithEmail(page: Page, email: string, inboxId: string) {
    await page.goto('/login');
    await page.click('button:has-text("Continue with Google")');

    // WorkOS redirects to email verification
    await page.waitForURL(/workos\.com/);
    await page.fill('input[type="email"]', email);
    await page.click('button[type="submit"]');

    // Wait for verification email
    const { verificationLink } = await EmailTestHelper.waitForVerificationEmail(inboxId);

    // Click verification link
    await page.goto(verificationLink);

    // Should redirect back to app
    await page.waitForURL(/dashboard/);
  }
}
```

### 2.3 SmartMemory Test Helper

```typescript
// tests/helpers/smartmemory.ts
import { Page } from '@playwright/test';

export class SmartMemoryHelper {
  /**
   * Get user profile from SmartMemory via API
   */
  static async getUserProfile(userId: string) {
    const response = await fetch(
      `${process.env.TEST_RAINDROP_SERVICE_URL}/api/preferences/profile?userId=${userId}`
    );

    const data = await response.json();
    return data.profile;
  }

  /**
   * Update user profile and verify persistence
   */
  static async updateAndVerifyProfile(
    page: Page,
    userId: string,
    updates: Record<string, any>
  ) {
    // Get initial profile
    const initialProfile = await this.getUserProfile(userId);

    // Make update via UI
    await page.goto('/settings');

    for (const [field, value] of Object.entries(updates)) {
      await page.fill(`[name="${field}"]`, value);
    }

    await page.click('button:has-text("Save Changes")');
    await page.waitForSelector('text=Settings saved successfully');

    // Verify profile updated in SmartMemory
    const updatedProfile = await this.getUserProfile(userId);

    return {
      initial: initialProfile,
      updated: updatedProfile,
    };
  }

  /**
   * Test widget preferences persistence
   */
  static async testWidgetPreferences(page: Page, userId: string) {
    await page.goto('/dashboard');

    // Hide a widget
    await page.click('[data-widget="legislation"] button[aria-label="Hide widget"]');
    await page.waitForTimeout(1000); // Wait for save

    // Refresh page
    await page.reload();

    // Verify widget still hidden
    const widgetVisible = await page.isVisible('[data-widget="legislation"]');

    return !widgetVisible; // Should be false (hidden)
  }

  /**
   * Clear SmartMemory cache for user (test cleanup)
   */
  static async clearUserCache(userId: string) {
    await fetch(
      `${process.env.TEST_RAINDROP_SERVICE_URL}/api/test/clear-cache`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      }
    );
  }
}
```

---

## Phase 3: Test Suites

### 3.1 Onboarding Flow Test

```typescript
// tests/e2e/onboarding/complete-flow.spec.ts
import { test, expect } from '@playwright/test';
import { EmailTestHelper } from '../../helpers/mailslurp';
import { faker } from '@faker-js/faker';

test.describe('Onboarding Flow', () => {
  let inbox: { id: string; email: string };

  test.beforeEach(async () => {
    // Create temporary test inbox
    inbox = await EmailTestHelper.createInbox();
  });

  test.afterEach(async () => {
    // Cleanup
    await EmailTestHelper.deleteInbox(inbox.id);
  });

  test('complete onboarding with email verification', async ({ page }) => {
    // Start onboarding
    await page.goto('/onboarding');

    // Step 1: Email signup
    await page.fill('[name="email"]', inbox.email);
    await page.click('button:has-text("Continue")');

    // Wait for verification email
    const { verificationLink } = await EmailTestHelper.waitForVerificationEmail(
      inbox.id
    );
    expect(verificationLink).toContain('/verify');

    // Click verification link
    await page.goto(verificationLink);

    // Step 2: ZIP code lookup
    await page.waitForSelector('text=Enter your ZIP code');
    await page.fill('[name="zipCode"]', '53202'); // Milwaukee ZIP
    await page.click('button:has-text("Find My Representatives")');

    // Verify representatives loaded
    await expect(page.locator('text=Your Representatives')).toBeVisible();
    await expect(page.locator('[data-testid="representative-card"]')).toHaveCount(3); // 2 senators + 1 house rep

    await page.click('button:has-text("Continue")');

    // Step 3: Select interests
    await page.waitForSelector('text=What issues interest you?');
    await page.click('text=Healthcare');
    await page.click('text=Climate & Environment');
    await page.click('text=Education');
    await page.click('button:has-text("Continue")');

    // Step 4: Notification preferences
    await page.check('[name="emailNotifications"]');
    await page.check('[name="podcastNotifications"]');
    await page.click('button:has-text("Complete Setup")');

    // Verify redirected to dashboard
    await expect(page).toHaveURL(/\/dashboard/);

    // Verify welcome email sent
    const welcomeEmail = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Welcome to HakiVo'
    );
    expect(welcomeEmail.body).toContain('Your representatives');
    expect(welcomeEmail.body).toContain('Healthcare');
  });
});
```

### 3.2 SmartMemory Preference Test

```typescript
// tests/e2e/smartmemory/profile-persistence.spec.ts
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
    // Mock login
    await AuthHelper.mockLogin(page, testUser.email);
  });

  test.afterEach(async () => {
    // Cleanup
    await SmartMemoryHelper.clearUserCache(testUser.id);
  });

  test('user profile updates persist across sessions', async ({ page, context }) => {
    // Update profile
    const updates = {
      firstName: 'Jane',
      lastName: 'Doe',
      preferredLanguage: 'es',
    };

    const { initial, updated } = await SmartMemoryHelper.updateAndVerifyProfile(
      page,
      testUser.id,
      updates
    );

    // Verify changes
    expect(updated.firstName).toBe('Jane');
    expect(updated.lastName).toBe('Doe');
    expect(updated.preferredLanguage).toBe('es');

    // Open new browser context (simulate new session)
    const newContext = await context.browser()?.newContext();
    const newPage = await newContext!.newPage();
    await AuthHelper.mockLogin(newPage, testUser.email);

    // Navigate to settings
    await newPage.goto('/settings');

    // Verify profile loaded from SmartMemory
    await expect(newPage.locator('[name="firstName"]')).toHaveValue('Jane');
    await expect(newPage.locator('[name="lastName"]')).toHaveValue('Doe');
    await expect(newPage.locator('[name="preferredLanguage"]')).toHaveValue('es');

    await newContext!.close();
  });

  test('widget preferences persist after page reload', async ({ page }) => {
    const widgetHidden = await SmartMemoryHelper.testWidgetPreferences(
      page,
      testUser.id
    );

    expect(widgetHidden).toBe(true);
  });

  test('policy interests update and reflect in bill recommendations', async ({ page }) => {
    await page.goto('/settings');

    // Clear existing interests
    await page.click('button:has-text("Clear All")');

    // Select new interests
    await page.click('text=Technology & Privacy');
    await page.click('text=Defense & Security');
    await page.click('button:has-text("Save Changes")');

    // Navigate to dashboard
    await page.goto('/dashboard');

    // Wait for bill recommendations to load
    await page.waitForSelector('[data-testid="bill-card"]');

    // Verify bills match selected interests
    const billTopics = await page.locator('[data-testid="bill-topic"]').allTextContents();

    const hasRelevantTopics = billTopics.some(topic =>
      topic.includes('Technology') ||
      topic.includes('Privacy') ||
      topic.includes('Defense') ||
      topic.includes('Security')
    );

    expect(hasRelevantTopics).toBe(true);
  });
});
```

### 3.3 Email Notification Test

```typescript
// tests/e2e/notifications/bill-updates.spec.ts
import { test, expect } from '@playwright/test';
import { EmailTestHelper } from '../../helpers/mailslurp';
import { AuthHelper } from '../../helpers/auth';

test.describe('Email Notifications', () => {
  let inbox: { id: string; email: string };

  test.beforeEach(async ({ page }) => {
    inbox = await EmailTestHelper.createInbox();
    await AuthHelper.mockLogin(page, inbox.email);
  });

  test.afterEach(async () => {
    await EmailTestHelper.deleteInbox(inbox.id);
  });

  test('user receives bill update notification', async ({ page }) => {
    // Enable bill update notifications
    await page.goto('/settings');
    await page.check('[name="billUpdateNotifications"]');
    await page.click('button:has-text("Save Changes")');

    // Trigger bill update (via test API)
    await fetch('http://localhost:3000/api/test/trigger-bill-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: inbox.email,
        billId: 'hr-1234',
        updateType: 'status_change',
      }),
    });

    // Wait for notification email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Bill Update: H.R. 1234'
    );

    // Verify email content
    expect(email.body).toContain('H.R. 1234');
    expect(email.body).toContain('status has changed');
    expect(email.body).toContain('View Bill');

    // Verify email has unsubscribe link
    expect(email.body).toContain('Unsubscribe');
  });

  test('user receives podcast ready notification', async ({ page }) => {
    // Enable podcast notifications
    await page.goto('/settings');
    await page.check('[name="podcastNotifications"]');
    await page.click('button:has-text("Save Changes")');

    // Trigger podcast generation (via test API)
    await fetch('http://localhost:3000/api/test/generate-podcast', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: inbox.email,
        type: 'daily',
      }),
    });

    // Wait for notification email
    const email = await EmailTestHelper.waitForNotificationEmail(
      inbox.id,
      'Your Daily Briefing is Ready'
    );

    // Verify email content
    expect(email.body).toContain('daily briefing');
    expect(email.body).toContain('Listen Now');

    // Extract podcast link and verify it works
    const linkMatch = email.body!.match(/href="([^"]*podcast[^"]*)"/);
    expect(linkMatch).toBeTruthy();

    const podcastLink = linkMatch![1];
    await page.goto(podcastLink);
    await expect(page.locator('audio')).toBeVisible();
  });

  test('quiet hours prevent notifications', async ({ page }) => {
    const now = new Date();
    const quietStart = new Date(now.getTime() - 1000 * 60 * 60); // 1 hour ago
    const quietEnd = new Date(now.getTime() + 1000 * 60 * 60); // 1 hour from now

    // Enable quiet hours
    await page.goto('/settings');
    await page.check('[name="quietHoursEnabled"]');
    await page.fill('[name="quietHoursStart"]', quietStart.toTimeString().slice(0, 5));
    await page.fill('[name="quietHoursEnd"]', quietEnd.toTimeString().slice(0, 5));
    await page.click('button:has-text("Save Changes")');

    // Trigger notification during quiet hours
    await fetch('http://localhost:3000/api/test/trigger-bill-update', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        userId: inbox.email,
        billId: 'hr-5678',
        updateType: 'new_vote',
      }),
    });

    // Verify no email received (should timeout)
    await expect(async () => {
      await EmailTestHelper.waitForNotificationEmail(
        inbox.id,
        'Bill Update',
        10000 // 10 second timeout
      );
    }).rejects.toThrow();
  });
});
```

---

## Phase 4: CI/CD Integration

### 4.1 GitHub Actions Workflow

```yaml
# .github/workflows/e2e-tests.yml
name: E2E Tests

on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main, develop]

jobs:
  test:
    timeout-minutes: 60
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install Playwright Browsers
        run: npx playwright install --with-deps

      - name: Set up environment
        env:
          MAILSLURP_API_KEY: ${{ secrets.MAILSLURP_API_KEY }}
          WORKOS_API_KEY: ${{ secrets.WORKOS_TEST_API_KEY }}
          RAINDROP_SQL_URL: ${{ secrets.RAINDROP_TEST_SQL_URL }}
        run: |
          cp .env.test.example .env.test
          echo "MAILSLURP_API_KEY=$MAILSLURP_API_KEY" >> .env.test

      - name: Run E2E tests
        run: npx playwright test

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: playwright-report
          path: playwright-report/
          retention-days: 30

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: test-results
          path: test-results/
          retention-days: 30
```

---

## Phase 5: Best Practices

### 5.1 Test Data Management

```typescript
// tests/fixtures/users.ts
export const TEST_USERS = {
  NEW_USER: {
    email: 'new-user@example.com',
    zipCode: '53202',
    interests: ['Healthcare', 'Education'],
  },
  EXISTING_USER: {
    email: 'existing@example.com',
    firstName: 'John',
    lastName: 'Doe',
    preferredLanguage: 'en',
    interests: ['Climate & Environment', 'Technology & Privacy'],
  },
};
```

### 5.2 Test Isolation

- Use unique MailSlurp inboxes for each test
- Clear SmartMemory cache after each test
- Use database transactions for test data
- Reset browser context between tests

### 5.3 Performance Optimization

```typescript
// Use page object models
class DashboardPage {
  constructor(private page: Page) {}

  async goto() {
    await this.page.goto('/dashboard');
  }

  async hideWidget(widgetName: string) {
    await this.page.click(`[data-widget="${widgetName}"] button[aria-label="Hide widget"]`);
  }

  async isWidgetVisible(widgetName: string) {
    return this.page.isVisible(`[data-widget="${widgetName}"]`);
  }
}
```

### 5.4 Error Handling

```typescript
// Retry flaky operations
async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries = 3
): Promise<T> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  throw new Error('Max retries reached');
}
```

---

## Phase 6: Test Coverage Goals

### Priority 1 (Must Have):
- ✅ Onboarding flow (email verification, ZIP lookup, interests)
- ✅ User profile updates (SmartMemory persistence)
- ✅ Email notifications (bill updates, podcast ready)
- ✅ Widget customization (show/hide, reorder)

### Priority 2 (Should Have):
- Notification preferences (quiet hours, channels)
- Representative data display
- Policy interest filtering
- Audio player functionality

### Priority 3 (Nice to Have):
- Mobile responsiveness tests
- Cross-browser compatibility
- Performance benchmarks
- Accessibility compliance

---

## Phase 7: Maintenance

### Weekly Tasks:
- Review test failures in CI/CD
- Update test data fixtures
- Check MailSlurp inbox usage (rate limits)
- Prune old test artifacts

### Monthly Tasks:
- Update Playwright and dependencies
- Review test coverage metrics
- Refactor flaky tests
- Document new testing patterns

---

## Cost Estimation

### MailSlurp:
- **Free tier:** 5 inboxes, 100 emails/month (good for development)
- **Starter:** $16/month - 50 inboxes, 1000 emails (good for CI/CD)
- **Pro:** $49/month - Unlimited inboxes, 10k emails (production testing)

### Playwright:
- **Free and open source**

### CI/CD (GitHub Actions):
- **2000 minutes/month free** (sufficient for small teams)

---

## Success Metrics

- **Test Coverage:** >80% of critical user flows
- **Test Execution Time:** <10 minutes for full suite
- **Flaky Test Rate:** <5%
- **Bug Detection:** Catch 90% of bugs before production

---

**Ready to implement?** Let's start with Phase 1 (setup) and work our way through the plan systematically.
