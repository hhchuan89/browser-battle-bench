import { defineConfig } from '@playwright/test'

const baseURL = process.env.BBB_BASE_URL || 'http://localhost:5173'
const browserChannel = process.env.BBB_PLAYWRIGHT_CHANNEL || 'chromium'
const useRemoteBaseURL = Boolean(process.env.BBB_BASE_URL)

export default defineConfig({
  testDir: './tests/ui',
  timeout: 30000,
  expect: { timeout: 5000 },
  use: {
    baseURL,
    channel: browserChannel,
    headless: true,
    viewport: { width: 1280, height: 720 },
  },
  webServer: useRemoteBaseURL
    ? undefined
    : {
        command: 'npm run dev -- --host 127.0.0.1 --port 5173',
        url: 'http://127.0.0.1:5173',
        reuseExistingServer: true,
        timeout: 120000,
      },
  retries: process.env.CI ? 1 : 0,
  reporter: [['list']]
})
