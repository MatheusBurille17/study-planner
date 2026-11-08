import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import tsconfigPaths from 'vite-tsconfig-paths'

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./__tests__/setup.ts'],
    include: ['__tests__/**/*.test.{ts,tsx}'],
    testTimeout: 15_000,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
      include: ['src/features/**/domain/**', 'src/features/**/application/**', 'src/shared/**'],
    },
  },
})
