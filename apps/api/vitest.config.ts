import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    globals: true,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov'],
      reportsDirectory: 'coverage',
      lines: 0.85,
      branches: 0.85,
      statements: 0.85,
      functions: 0.85,
      include: ['src/**/*.ts'],
      exclude: ['src/**/*.d.ts', 'src/index.ts', 'src/seed/**', 'src/scripts/**'],
    },
  },
})
