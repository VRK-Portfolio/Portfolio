import { defineConfig } from 'vitest/config';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: 'jsdom', // Node runtime to match Next.js server context
    globals: true,
    testTimeout: 15000, // Set a default test timeout (in milliseconds)
    hookTimeout: 30000,
    setupFiles: ['./vitest.setup.ts', './src/tests/jwt-setup.ts'],
    alias: {
      '@': path.resolve(__dirname, 'src')
    },
    env: {
      JWT_SECRET: process.env.JWT_SECRET || 'default_jwt_secret',
      REFRESH_JWT_SECRET: process.env.REFRESH_JWT_SECRET || 'default_refresh_token_secret'
    },
    include: ['src/**/*.test.ts', 'src/**/*.test.tsx'],
    exclude: ['e2e/**/*', 'node_modules', '.next', 'src/mocks/**'],
    // Coverage configuration
    coverage: {
      provider: 'v8', // or 'istanbul'
      reporter: ['text', 'json', 'html'], // Formats: terminal summary, JSON, and interactive HTML
      reportsDirectory: './coverage',
      include: ['src/**/*.{ts,tsx}', 'next.config.ts'],
      exclude: [
        'src/**/*.stories.{ts,tsx}',
        'src/**/*.test.{ts,tsx}',
        'src/**/__tests__/**',
        "src/app/**/layout.tsx",
        'src/types/**',
        'src/@types/ApiResponse.types.ts',
        'src/tests/**',
        'src/mocks/**',
        "src/libs/db.ts",             // Exclude specific file
        "src/libs/env.ts",
        '**/*.d.ts',
        '**/.next/**',
      ],
      // Optional: Set strict coverage thresholds to fail CI if tests fall short
      thresholds: {
        statements: 80,
        branches: 80,
        functions: 80,
        lines: 80,
      },
    },
  },
});
