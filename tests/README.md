# HakiVo E2E Tests

## Test User Management

### Automatic Cleanup ✅
Test users are **automatically cleaned up** after each test run via Playwright's global teardown.

When you run `npm test`, it will:
1. Create test users with `test_` prefix during tests
2. Run all test suites
3. **Automatically delete all test users** when tests complete

### Manual Cleanup (If Needed)
If tests are interrupted or you need to manually clean up:

```bash
npx tsx scripts/cleanup-test-users.ts
```

This will delete all users with IDs starting with `test_`.

---

## Test Authentication

Tests use a simplified auth flow via `/api/test/auth` that:
- Creates test users with fake emails (base64 encoded names)
- Bypasses real OAuth flows
- Returns JWT tokens directly

**Example test user IDs:**
- `test_RG9tZW5pY28uR3VsZ293`
- `test_VGhhZC5Xb2xmMjRAZ21h`

This approach is:
- ✅ **Fast** - No email delivery delays
- ✅ **Free** - No external services needed
- ✅ **Reliable** - No flaky email providers
- ✅ **Standard** - Common pattern for E2E tests

---

## Why Not MailSlurp?

We don't use MailSlurp (or similar email testing services) because:

1. **Not needed** - Tests use JWT directly, no email verification required
2. **Too slow** - Real email delivery adds 5-15s per test
3. **Costs money** - $49+/month for testing volumes
4. **Adds flakiness** - Email delays, spam filters, rate limits

**When MailSlurp makes sense:**
- Testing email content/templates
- Testing password reset flows
- Testing email-triggered workflows

For widget customization tests, direct JWT auth is perfect!

---

## Running Tests

```bash
# Run all E2E tests with automatic cleanup
npm test

# Run specific test file
npm test -- tests/e2e/dashboard/widget-customization.spec.ts

# Run in specific browser
npm test -- --project=chromium

# Run in headed mode (see browser)
npm test -- --headed

# Debug mode (step through)
npm test -- --debug
```

---

## Test Structure

```
tests/
├── e2e/                      # End-to-end tests
│   ├── dashboard/            # Dashboard tests
│   │   └── widget-customization.spec.ts
│   └── ...
├── helpers/                  # Test utilities
│   └── auth.ts              # Auth helper (creates test users)
├── global-teardown.ts       # Cleanup test users after all tests
└── README.md                # This file
```

---

## CI/CD Integration

The automatic cleanup works in both local and CI environments:

- **Local**: Cleans up after each test run
- **CI**: Cleans up after all tests complete
- **Interrupted runs**: Use manual cleanup script

No configuration needed - it just works! 🎉
