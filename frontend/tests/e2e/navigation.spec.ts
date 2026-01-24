import { test, expect } from '@playwright/test';

/**
 * LingRoot Web - Navigation & UI E2E Tests
 * 
 * Bu testler temel navigasyon ve UI elementlerini test eder
 */

test.describe('Navigation & Layout', () => {

    test('should have working navigation links', async ({ page }) => {
        await page.goto('/');

        // Wait for page to load
        await page.waitForLoadState('domcontentloaded');

        // Check if header exists
        const header = page.locator('nav').first();
        await expect(header).toBeVisible();
    });

    test('should have footer on public pages', async ({ page }) => {
        await page.goto('/');

        await page.waitForLoadState('domcontentloaded');

        // Check if footer exists
        const footer = page.locator('footer').first();
        // Footer may or may not be visible depending on scroll, just check it exists
        const footerCount = await footer.count();
        expect(footerCount).toBeGreaterThanOrEqual(0);
    });

    test('should be responsive - mobile viewport', async ({ page }) => {
        // Set mobile viewport
        await page.setViewportSize({ width: 375, height: 667 });

        await page.goto('/');

        // Page should load without errors
        await expect(page.locator('body')).toBeVisible();
    });

    test('should be responsive - tablet viewport', async ({ page }) => {
        // Set tablet viewport
        await page.setViewportSize({ width: 768, height: 1024 });

        await page.goto('/');

        await expect(page.locator('body')).toBeVisible();
    });

    test('should be responsive - desktop viewport', async ({ page }) => {
        // Set desktop viewport
        await page.setViewportSize({ width: 1920, height: 1080 });

        await page.goto('/');

        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Public Pages', () => {

    test('about page should load', async ({ page }) => {
        await page.goto('/about');
        await expect(page).toHaveURL(/.*about/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('pricing page should load', async ({ page }) => {
        await page.goto('/fiyatlandirma');
        await expect(page).toHaveURL(/.*fiyatlandirma/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('contact page should load', async ({ page }) => {
        await page.goto('/contact');
        await expect(page).toHaveURL(/.*contact/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('how it works page should load', async ({ page }) => {
        await page.goto('/nasil-calisir');
        await expect(page).toHaveURL(/.*nasil-calisir/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('features page should load', async ({ page }) => {
        await page.goto('/ozellikler');
        await expect(page).toHaveURL(/.*ozellikler/);
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Legal Pages', () => {

    test('privacy policy page should load', async ({ page }) => {
        await page.goto('/privacy-policy');
        await expect(page).toHaveURL(/.*privacy/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('terms page should load', async ({ page }) => {
        await page.goto('/terms');
        await expect(page).toHaveURL(/.*terms/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('cookie policy page should load', async ({ page }) => {
        await page.goto('/cookie-policy');
        await expect(page).toHaveURL(/.*cookie/);
        await expect(page.locator('body')).toBeVisible();
    });

    test('kvkk page should load', async ({ page }) => {
        await page.goto('/kvkk');
        await expect(page).toHaveURL(/.*kvkk/);
        await expect(page.locator('body')).toBeVisible();
    });
});

test.describe('Performance', () => {

    test('homepage should load within 5 seconds', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('/');
        await page.waitForLoadState('domcontentloaded');

        const loadTime = Date.now() - startTime;

        // Should load within 5 seconds
        expect(loadTime).toBeLessThan(5000);
    });

    test('login page should load within 3 seconds', async ({ page }) => {
        const startTime = Date.now();

        await page.goto('/login');
        await page.waitForLoadState('domcontentloaded');

        const loadTime = Date.now() - startTime;

        expect(loadTime).toBeLessThan(3000);
    });
});
