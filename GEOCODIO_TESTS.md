# Geocodio Integration Tests

Comprehensive test suite for Geocodio API integration and representative data management.

---

## Test Coverage

### 1. **Geocodio API Tests** (`lib/api/__tests__/geocodio.test.ts`)

Tests for ZIP code lookup and congressional district resolution.

**Coverage**:
- ✅ Successfully fetch congressional district for valid ZIP code
- ✅ Handle ZIP codes with multiple congressional districts
- ✅ Handle invalid ZIP code (422 error)
- ✅ Handle missing API key
- ✅ Handle response with no congressional districts
- ✅ Handle Senators (no district number)
- ✅ Include all 3 legislators (1 House + 2 Senate)

**Example Test**:
```typescript
it('should successfully fetch congressional district for valid ZIP code', async () => {
  const result = await lookupCongressionalDistrict('94102');

  expect(result.state).toBe('CA');
  expect(result.district).toBe(11);
  expect(result.legislators).toHaveLength(1);
  expect(result.legislators[0].bio.last_name).toBe('Pelosi');
});
```

---

### 2. **Database Operations Tests** (`lib/db/__tests__/representatives.test.ts`)

Tests for saving and retrieving Geocodio legislator data from Raindrop database.

**Coverage**:
- ✅ Save single legislator to database
- ✅ Save all 3 legislators (1 House + 2 Senate)
- ✅ Extract state from address correctly
- ✅ Link user to all their representatives
- ✅ Use INSERT OR IGNORE to prevent duplicates
- ✅ Retrieve all representatives for a user
- ✅ Retrieve representative by bioguide ID
- ✅ Return null if representative not found
- ✅ Update user state and district
- ✅ Handle null district for senators

**Example Test**:
```typescript
it('should save all 3 legislators (1 House + 2 Senate)', async () => {
  const legislators = [
    { type: 'representative', references: { bioguide_id: 'P000197' } },
    { type: 'senator', references: { bioguide_id: 'P000145' } },
    { type: 'senator', references: { bioguide_id: 'S001150' } }
  ];

  const result = await saveLegislatorsToDatabase(legislators, mockFetch);

  expect(result).toHaveLength(3);
  expect(result).toContain('P000197'); // Pelosi
  expect(result).toContain('P000145'); // Padilla
  expect(result).toContain('S001150'); // Schiff
});
```

---

### 3. **End-to-End Integration Tests** (`__tests__/integration/geocodio-integration.test.ts`)

Tests the complete flow from ZIP lookup to database storage.

**Coverage**:
- ✅ Complete flow: ZIP → Geocodio → Database → Retrieval
- ✅ Handle ZIP code with all 3 legislators
- ✅ Validate required Geocodio fields for database insert
- ✅ Handle invalid ZIP code gracefully
- ✅ Handle network errors
- ✅ Handle missing API key
- ✅ Validate bioguide ID format
- ✅ Validate state codes
- ✅ Validate district numbers
- ✅ Validate phone number format
- ✅ Validate URL format

**Example Test**:
```typescript
it('should complete full flow: ZIP → Geocodio → Database → Retrieval', async () => {
  const zipCode = '94102';
  const userId = 'test_user_123';

  // 1. User enters ZIP code
  // 2. Lookup congressional district via Geocodio
  const result = await lookupCongressionalDistrict(zipCode);

  // 3. Verify response structure
  expect(result.state).toBe('CA');
  expect(result.district).toBe(11);
  expect(result.legislators).toHaveLength(1);

  // 4. Verify legislator data
  const rep = result.legislators[0];
  expect(rep.bio.first_name).toBe('Nancy');
  expect(rep.references.bioguide_id).toBe('P000197');
  expect(rep.contact.phone).toBe('(202) 225-4965');
});
```

---

## Running Tests

### Install Dependencies

```bash
npm install --save-dev vitest @testing-library/react @testing-library/jest-dom @vitejs/plugin-react
```

### Run All Tests

```bash
npm test
```

### Run Specific Test File

```bash
# Geocodio API tests
npm test geocodio.test

# Database tests
npm test representatives.test

# Integration tests
npm test geocodio-integration
```

### Run Tests in Watch Mode

```bash
npm test -- --watch
```

### Generate Coverage Report

```bash
npm test -- --coverage
```

---

## Test Configuration

**vitest.config.ts**:
```typescript
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html']
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
```

**vitest.setup.ts**:
```typescript
import { beforeAll, vi } from 'vitest';
import '@testing-library/jest-dom';

beforeAll(() => {
  process.env.GEOCODIO_API_KEY = 'test_geocodio_key';
  process.env.RAINDROP_SERVICE_URL = 'https://test.raindrop.run';
  process.env.CONGRESS_API_KEY = 'test_congress_key';
});
```

---

## Mock Data

### Sample Geocodio Response

```json
{
  "input": {
    "address_components": {
      "zip": "94102",
      "country": "US"
    }
  },
  "results": [
    {
      "address_components": {
        "city": "San Francisco",
        "state": "CA",
        "zip": "94102"
      },
      "fields": {
        "congressional_districts": [
          {
            "name": "Congressional District 11",
            "district_number": 11,
            "current_legislators": [
              {
                "type": "representative",
                "bio": {
                  "first_name": "Nancy",
                  "last_name": "Pelosi",
                  "party": "Democratic"
                },
                "contact": {
                  "url": "https://pelosi.house.gov",
                  "phone": "(202) 225-4965"
                },
                "references": {
                  "bioguide_id": "P000197"
                }
              }
            ]
          }
        ]
      }
    }
  ]
}
```

---

## Data Validation Rules

### Bioguide ID
- **Format**: `^[A-Z]\d{6}$`
- **Example**: `P000197`

### State Code
- **Format**: `^[A-Z]{2}$`
- **Example**: `CA`, `NY`, `TX`

### District Number
- **Range**: 1-53 (null for senators)
- **Example**: `11`, `30`, `null`

### Phone Number
- **Format**: `(XXX) XXX-XXXX` or `XXX-XXX-XXXX`
- **Example**: `(202) 225-4965`

### Chamber
- **Values**: `House`, `Senate`

### Party
- **Values**: `Democratic`, `Republican`, `Independent`

---

## CI/CD Integration

### GitHub Actions Example

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
      - run: npm test -- --coverage
```

---

## Troubleshooting

### Tests Fail with "GEOCODIO_API_KEY is not set"

**Solution**: Environment variables are mocked in `vitest.setup.ts`. Ensure the setup file is loaded:

```typescript
// vitest.config.ts
export default defineConfig({
  test: {
    setupFiles: ['./vitest.setup.ts']
  }
});
```

### Mock Fetch Not Working

**Solution**: Ensure `vi.fn()` is used and cleared between tests:

```typescript
import { vi, beforeEach } from 'vitest';

beforeEach(() => {
  vi.clearAllMocks();
});
```

### TypeScript Errors

**Solution**: Update `tsconfig.json` to include test files:

```json
{
  "include": [
    "**/*.ts",
    "**/*.tsx",
    "**/*.test.ts",
    "vitest.config.ts"
  ]
}
```

---

## Test Scripts

Add to `package.json`:

```json
{
  "scripts": {
    "test": "vitest",
    "test:ui": "vitest --ui",
    "test:coverage": "vitest --coverage",
    "test:watch": "vitest --watch"
  }
}
```

---

## Coverage Goals

- **Geocodio API**: 100%
- **Database Operations**: 95%+
- **Integration Tests**: 90%+
- **Overall**: 95%+

---

## Next Steps

1. ✅ Install test dependencies
2. ✅ Run tests to verify setup
3. ✅ Generate coverage report
4. ⏳ Add more edge case tests
5. ⏳ Integrate with CI/CD pipeline
6. ⏳ Add performance benchmarks

---

**Test with confidence! All Geocodio integration paths are covered.**
