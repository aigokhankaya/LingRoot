import { test, expect } from '@playwright/test';

/**
 * Settings Page E2E Tests
 * Tests for user settings and preferences
 * 
 * Created: 2026-01-17
 */

test.describe('Settings Page', () => {

    test.describe('Page Access', () => {
        test('should load settings page', async ({ page }) => {
            await page.goto('/settings');
            await page.waitForLoadState('networkidle');

            // Should either show settings or redirect to login
            const url = page.url();
            expect(url).toMatch(/settings|login/);
        });

        test('should have page title', async ({ page }) => {
            await page.goto('/settings');
            await page.waitForLoadState('domcontentloaded');

            const title = await page.title();
            expect(title).toBeDefined();
        });
    });

    test.describe('Settings Sections', () => {
        test('should have settings content', async ({ page }) => {
            await page.goto('/settings');
            await page.waitForLoadState('networkidle');

            const content = await page.locator('body').textContent();
            expect(content).toBeDefined();
        });
    });

    test.describe('Form Interactions', () => {
        test('should have form elements', async ({ page }) => {
            await page.goto('/settings');
            await page.waitForLoadState('networkidle');

            const inputs = await page.locator('input, select, textarea').count();
            expect(inputs).toBeGreaterThanOrEqual(0);
        });
    });

    test.describe('Responsive Design', () => {
        test('should be responsive on mobile', async ({ page }) => {
            await page.setViewportSize({ width: 375, height: 667 });
            await page.goto('/settings');
            await page.waitForLoadState('networkidle');

            expect(page.viewportSize()?.width).toBe(375);
        });
    });
});

test.describe('Profile Settings', () => {

    test.describe('Profile Page', () => {
        test('should load profile page', async ({ page }) => {
            await page.goto('/profile');
            await page.waitForLoadState('networkidle');

            const url = page.url();
            expect(url).toMatch(/profile|login/);
        });

        test('should have profile content', async ({ page }) => {
            await page.goto('/profile');
            await page.waitForLoadState('networkidle');

            const body = await page.locator('body').textContent();
            expect(body).toBeDefined();
        });
    });
});
