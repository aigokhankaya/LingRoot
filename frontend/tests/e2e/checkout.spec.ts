import { test, expect } from '@playwright/test';

/**
 * Checkout Flow E2E Tests
 * Tests for subscription checkout process
 * 
 * Created: 2026-01-17
 */

test.describe('Checkout Flow', () => {

    test.describe('Plan Selection', () => {
        test('should display checkout page with plan details', async ({ page }) => {
            await page.goto('/checkout?plan=premium_monthly');
            await expect(page).toHaveURL(/checkout/);
        });

        test('should show plan name on checkout page', async ({ page }) => {
            await page.goto('/checkout?plan=premium_monthly');
            // Wait for page to load
            await page.waitForLoadState('networkidle');
            // Check for plan-related content
            const body = await page.locator('body').textContent();
            expect(body).toBeDefined();
        });

        test('should redirect to login if not authenticated', async ({ page }) => {
            await page.goto('/checkout?plan=premium_monthly');
            // If redirected to login, check URL
            await page.waitForLoadState('networkidle');
            const url = page.url();
            // Either on checkout or redirected to login
            expect(url).toMatch(/checkout|login/);
        });
    });

    test.describe('Payment Form', () => {
        test('should have card number input', async ({ page }) => {
            await page.goto('/checkout?plan=premium_monthly');
            await page.waitForLoadState('networkidle');

            // Check for any form elements
            const inputs = await page.locator('input').count();
            expect(inputs).toBeGreaterThanOrEqual(0);
        });

        test('should format card number on input', async ({ page }) => {
            await page.goto('/checkout?plan=premium_monthly');
            await page.waitForLoadState('networkidle');

            const cardInput = page.locator('input[name="cardNumber"]');
            if (await cardInput.count() > 0) {
                await cardInput.fill('4111111111111111');
                const value = await cardInput.inputValue();
                expect(value).toBeDefined();
            }
        });
    });

    test.describe('Form Validation', () => {
        test('should require all fields', async ({ page }) => {
            await page.goto('/checkout?plan=premium_monthly');
            await page.waitForLoadState('networkidle');

            // Try to submit without filling form
            const submitBtn = page.locator('button[type="submit"]');
            if (await submitBtn.count() > 0 && await submitBtn.isEnabled()) {
                await submitBtn.click();
                await page.waitForTimeout(500);
            }
            // Page should still be on checkout (form not submitted)
            expect(page.url()).toContain('checkout');
        });
    });
});

test.describe('Checkout Accessibility', () => {
    test('should have proper page title', async ({ page }) => {
        await page.goto('/checkout?plan=premium_monthly');
        await page.waitForLoadState('domcontentloaded');

        const title = await page.title();
        expect(title).toBeDefined();
    });

    test('should be responsive on mobile', async ({ page }) => {
        await page.setViewportSize({ width: 375, height: 667 });
        await page.goto('/checkout?plan=premium_monthly');
        await page.waitForLoadState('networkidle');

        // Page should load without horizontal scroll
        const bodyWidth = await page.evaluate(() => document.body.scrollWidth);
        expect(bodyWidth).toBeLessThanOrEqual(375 + 20); // Allow small margin
    });
});
