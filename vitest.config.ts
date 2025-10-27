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
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules/',
        'dist/',
        '.next/',
        '**/*.config.ts',
        '**/*.test.ts',
        '**/__tests__/**'
      ]
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './')
    }
  }
});
