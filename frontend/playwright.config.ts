import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright Configuration for LingRoot Web E2E Tests
 * 
 * Features:
 * - Multi-browser testing (Chrome, Firefox, Safari)
 * - Mobile viewport testing
 * - Screenshot on failure
 * - Video recording on failure
 * - Parallel execution
 */

export default defineConfig({
    testDir: './tests/e2e',
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    workers: process.env.CI ? 1 : undefined,
    reporter: [
        ['html', { open: 'never' }],
        ['list'],
    ],
    use: {
        baseURL: 'http://localhost:3000',
        trace: 'on-first-retry',
        // Take screenshot only on failure
        screenshot: 'only-on-failure',
        // Record video only on failure
        video: 'on-first-retry',
        // Set default timeout
        actionTimeout: 10000,
        navigationTimeout: 30000,
    },
    // Global timeout for each test
    timeout: 60000,
    // Expect timeout
    expect: {
        timeout: 10000,
    },
    projects: [
        {
            name: 'chromium',
            use: { ...devices['Desktop Chrome'] },
        },
        {
            name: 'firefox',
            use: { ...devices['Desktop Firefox'] },
        },
        {
            name: 'webkit',
            use: { ...devices['Desktop Safari'] },
        },
        {
            name: 'Mobile Chrome',
            use: { ...devices['Pixel 5'] },
        },
        {
            name: 'Mobile Safari',
            use: { ...devices['iPhone 12'] },
        },
    ],
    webServer: {
        command: 'npm run dev',
        url: 'http://localhost:3000',
        reuseExistingServer: !process.env.CI,
        timeout: 120 * 1000,
    },
    // Output directory for test artifacts
    outputDir: 'test-results/',
});
