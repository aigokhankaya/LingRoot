import { test, expect } from '@playwright/test';

test('has title', async ({ page }) => {
    await page.goto('/');

    // Expect a title "to contain" a substring.
    await expect(page).toHaveTitle(/LingRoot/);
});

test('get started link', async ({ page }) => {
    await page.goto('/');

    // Check if we can find a heading or main element
    // Adjust this selector based on actual homepage content
    const heading = page.getByRole('heading', { level: 1 }).first();
    await expect(heading).toBeVisible();
});
