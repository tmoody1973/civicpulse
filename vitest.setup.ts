/**
 * Vitest Setup File
 *
 * Global test configuration and mocks
 */

import { beforeAll, afterEach, afterAll, vi } from 'vitest';
import '@testing-library/jest-dom';

// Mock environment variables
beforeAll(() => {
  process.env.GEOCODIO_API_KEY = 'test_geocodio_key';
  process.env.RAINDROP_SERVICE_URL = 'https://test.raindrop.run';
  process.env.CONGRESS_API_KEY = 'test_congress_key';
});

// Clean up after each test
afterEach(() => {
  vi.clearAllMocks();
});

// Global cleanup
afterAll(() => {
  vi.restoreAllMocks();
});
