import { defineConfig, devices } from '@playwright/test';

import { env } from './src/config/env';

/**
 * Playwright Test configuration.
 *
 * Reporting and artefacts are deliberately centralised under `reports/` so the
 * whole evidence pack (HTML report, videos, traces, JUnit XML) can be published
 * from a single directory in CI.
 *
 * @see https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',

  /* The public OrangeHRM demo is shared and occasionally slow, so the per-test
     budget is generous while individual actions stay tightly bounded. */
  timeout: 3 * 60 * 1000,
  expect: { timeout: 15 * 1000 },
  globalTimeout: 30 * 60 * 1000,

  /* The scenario mutates shared server-side data, so tests run one at a time
     to keep results deterministic and to stay a polite API consumer. */
  fullyParallel: false,
  workers: 1,

  retries: env.isCI ? 1 : 0,
  forbidOnly: env.isCI,

  outputDir: 'reports/test-artifacts',

  reporter: [
    ['list'],
    ['html', { outputFolder: 'reports/html-report', open: 'never' }],
    ['junit', { outputFile: 'reports/junit/results.xml' }],
    ['json', { outputFile: 'reports/json/results.json' }],
    // Publishes each recording to reports/videos/<test-title>.webm so the run
    // video is browsable in the repository rather than buried under a hash.
    ['./src/reporters/video-collector.reporter.ts', { outputFolder: 'reports/videos' }],
  ],

  use: {
    baseURL: env.baseUrl,
    headless: env.headless,

    actionTimeout: 20 * 1000,
    navigationTimeout: 60 * 1000,

    /* Evidence capture: every run is recorded, traces and screenshots are kept
       whenever a test needs investigating. */
    video: { mode: 'on', size: { width: 1280, height: 720 } },
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',

    testIdAttribute: 'data-testid',
    ignoreHTTPSErrors: true,
  },

  projects: [
    {
      name: 'chromium',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 900 },
      },
    },
  ],
});
