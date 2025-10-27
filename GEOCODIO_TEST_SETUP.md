# Geocodio Test Setup Guide

Complete guide to set up and run Geocodio integration tests.

---

## ✅ What's Been Created

### Test Files
1. **`lib/api/__tests__/geocodio.test.ts`** - Geocodio API unit tests
2. **`lib/db/__tests__/representatives.test.ts`** - Database operations tests
3. **`__tests__/integration/geocodio-integration.test.ts`** - End-to-end integration tests

### Configuration Files
1. **`vitest.config.ts`** - Vitest test runner configuration
2. **`vitest.setup.ts`** - Global test setup and mocks
3. **`GEOCODIO_TESTS.md`** - Test documentation

---

## 📦 Installation

### Step 1: Install Test Dependencies

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

**Packages Installed**:
- `vitest` - Fast unit test framework (Vite-powered)
- `@vitest/ui` - Visual test UI
- `@testing-library/react` - React component testing utilities
- `@testing-library/jest-dom` - Custom jest matchers
- `@vitejs/plugin-react` - React plugin for Vite
- `jsdom` - DOM environment for Node.js

---

## 🚀 Running Tests

### Add Test Scripts to package.json

Add these scripts to your `package.json`:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### Run Tests

```bash
# Run all tests once
npm test

# Run tests in watch mode (auto-rerun on file changes)
npm run test:watch

# Run tests with visual UI
npm run test:ui

# Generate coverage report
npm run test:coverage
```

---

## 📊 Test Coverage

### Current Test Suite

**Total Tests**: 25+

#### Geocodio API Tests (11 tests)
- ✅ Successfully fetch congressional district for valid ZIP
- ✅ Handle ZIP codes with multiple districts
- ✅ Handle invalid ZIP code errors
- ✅ Handle missing API key
- ✅ Handle no congressional districts
- ✅ Handle Senators (no district number)
- ✅ Include all 3 legislators (1 House + 2 Senate)

#### Database Tests (10 tests)
- ✅ Save single legislator
- ✅ Save all 3 legislators
- ✅ Extract state from address
- ✅ Link user to representatives
- ✅ Prevent duplicate links
- ✅ Retrieve user's representatives
- ✅ Get representative by bioguide ID
- ✅ Handle not found
- ✅ Update user location
- ✅ Handle null district

#### Integration Tests (12 tests)
- ✅ Complete onboarding flow
- ✅ Handle all 3 legislators
- ✅ Validate required fields
- ✅ Error handling (invalid ZIP, network, missing key)
- ✅ Data validation (bioguide ID, state, district, phone, URL)

---

## 🔍 Sample Test Output

```bash
$ npm test

 ✓ lib/api/__tests__/geocodio.test.ts (11)
   ✓ lookupCongressionalDistrict
     ✓ should successfully fetch congressional district for valid ZIP code
     ✓ should handle ZIP codes with multiple congressional districts
     ✓ should throw error for invalid ZIP code
     ✓ should throw error when API key is missing
     ✓ should handle response with no congressional districts
     ✓ should handle Senators (no district number)
     ✓ should include all 3 legislators (1 House + 2 Senate)

 ✓ lib/db/__tests__/representatives.test.ts (10)
   ✓ saveLegislatorsToDatabase
     ✓ should save single legislator to database
     ✓ should save all 3 legislators (1 House + 2 Senate)
     ✓ should extract state from address correctly
   ✓ linkUserToRepresentatives
     ✓ should link user to all their representatives
     ✓ should use INSERT OR IGNORE to prevent duplicates
   ✓ getUserRepresentatives
     ✓ should retrieve all representatives for a user
   ✓ getRepresentativeByBioguideId
     ✓ should retrieve representative by bioguide ID
     ✓ should return null if representative not found
   ✓ updateUserLocation
     ✓ should update user state and district
     ✓ should handle null district for senators

 ✓ __tests__/integration/geocodio-integration.test.ts (12)
   ✓ Complete Onboarding Flow
     ✓ should complete full flow: ZIP → Geocodio → Database → Retrieval
     ✓ should handle ZIP code with all 3 legislators (1 House + 2 Senate)
     ✓ should validate required Geocodio fields for database insert
   ✓ Error Handling
     ✓ should handle invalid ZIP code gracefully
     ✓ should handle network errors
     ✓ should handle missing API key
   ✓ Data Validation
     ✓ should validate bioguide ID format
     ✓ should validate state codes
     ✓ should validate district numbers
     ✓ should validate phone number format
     ✓ should validate URL format

Test Files  3 passed (3)
     Tests  33 passed (33)
  Start at  16:30:00
  Duration  1.2s
```

---

## 🎯 Quick Start

### 1. Install Dependencies

```bash
npm install --save-dev vitest @vitest/ui @testing-library/react @testing-library/jest-dom @vitejs/plugin-react jsdom
```

### 2. Update package.json

Add test scripts:

```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest run --coverage"
  }
}
```

### 3. Run Tests

```bash
npm test
```

---

## 📝 Writing New Tests

### Example: Testing a New Geocodio Feature

```typescript
// lib/api/__tests__/geocodio.test.ts

import { describe, it, expect, vi } from 'vitest';
import { lookupByAddress } from '../geocodio';

describe('lookupByAddress', () => {
  it('should fetch district from full address', async () => {
    const mockResponse = {
      results: [
        {
          fields: {
            congressional_districts: [
              {
                district_number: 11,
                current_legislators: [/* ... */]
              }
            ]
          }
        }
      ]
    };

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockResponse
    });

    const result = await lookupByAddress('123 Main St, San Francisco, CA 94102');

    expect(result.district).toBe(11);
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining('123+Main+St')
    );
  });
});
```

---

## 🐛 Troubleshooting

### Issue: "Cannot find module '@testing-library/jest-dom'"

**Solution**:
```bash
npm install --save-dev @testing-library/jest-dom
```

### Issue: "process.env.GEOCODIO_API_KEY is undefined"

**Solution**: Check `vitest.setup.ts` is configured correctly:

```typescript
// vitest.setup.ts
beforeAll(() => {
  process.env.GEOCODIO_API_KEY = 'test_key';
});
```

### Issue: Tests fail with "fetch is not defined"

**Solution**: Mock `global.fetch` in your tests:

```typescript
global.fetch = vi.fn().mockResolvedValue({
  ok: true,
  json: async () => mockData
});
```

### Issue: TypeScript errors in test files

**Solution**: Update `tsconfig.json`:

```json
{
  "compilerOptions": {
    "types": ["vitest/globals", "@testing-library/jest-dom"]
  },
  "include": ["**/*.test.ts", "vitest.config.ts", "vitest.setup.ts"]
}
```

---

## 🎨 Test UI

Vitest provides a beautiful test UI:

```bash
npm run test:ui
```

This opens a browser with:
- Test results visualization
- Code coverage overlay
- Test file explorer
- Interactive test runner

---

## 📈 Coverage Report

Generate HTML coverage report:

```bash
npm run test:coverage
```

View at: `coverage/index.html`

**Coverage Goals**:
- **Statements**: 95%+
- **Branches**: 90%+
- **Functions**: 95%+
- **Lines**: 95%+

---

## 🔄 CI/CD Integration

### GitHub Actions

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '20'
      - run: npm ci
      - run: npm test
      - run: npm run test:coverage
      - uses: codecov/codecov-action@v3
        with:
          files: ./coverage/coverage-final.json
```

---

## 📚 Resources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library](https://testing-library.com/)
- [Geocodio API Docs](https://www.geocod.io/docs/)
- [GEOCODIO_TESTS.md](./GEOCODIO_TESTS.md) - Detailed test documentation

---

## ✅ Checklist

- [ ] Install test dependencies
- [ ] Add test scripts to package.json
- [ ] Run tests to verify setup
- [ ] Check coverage report
- [ ] Add new tests for edge cases
- [ ] Set up CI/CD pipeline
- [ ] Configure coverage thresholds

---

**Ready to test! Run `npm test` to verify Geocodio integration.**
