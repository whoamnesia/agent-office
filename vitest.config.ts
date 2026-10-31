import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    include: ['tests/unit/**/*.test.ts', 'tests/integration/**/*.test.ts', 'packages/*/test/**/*.test.ts'],
    testTimeout: 20000,
  },
});
