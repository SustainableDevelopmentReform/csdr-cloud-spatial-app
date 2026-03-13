import { fileURLToPath } from 'url'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  root: '.',
  resolve: {
    alias: {
      '~': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    fileParallelism: true,
    globalSetup: ['./src/test-global.ts'],
    hookTimeout: 120000,
    setupFiles: ['./src/test-setup.ts'],
    testTimeout: 120000,
  },
})
