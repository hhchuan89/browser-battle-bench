import { defineConfig } from '@playwright/test'

const baseURL = process.env.BBB_BASE_URL || 'http://localhost:5173'

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']]
})
