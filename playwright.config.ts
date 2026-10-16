import { defineConfig } from '@playwright/test'

const viewport = {
  desktop: { width: 1440, height: 900 },
  tablet: { width: 768, height: 1024 },
  mobile: { width: 390, height: 844 },
}

export default defineConfig({
  testDir: 'tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 12_000,
    toHaveScreenshot: { maxDiffPixelRatio: 0.03, animations: 'disabled' },
  },
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: [['list'], ['html', { open: 'never' }]],
  use: {
    baseURL: 'http://127.0.0.1:4183',
    locale: 'pt-BR',
    timezoneId: 'America/Sao_Paulo',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: 'npm run preview:e2e',
    url: 'http://127.0.0.1:4183',
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: 'desktop', testMatch: /marketplace\.spec\.ts/, use: { browserName: 'chromium', viewport: viewport.desktop } },
    { name: 'tablet', testMatch: /responsive\.spec\.ts/, use: { browserName: 'chromium', viewport: viewport.tablet } },
    {
      name: 'mobile',
      testMatch: /mobile\.spec\.ts/,
      use: { browserName: 'chromium', viewport: viewport.mobile, isMobile: true, hasTouch: true },
    },
  ],
})
