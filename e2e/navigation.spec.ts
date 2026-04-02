import { expect, test } from '@playwright/test';

test.describe('Navigation', () => {
  test('home page loads', async ({ page }) => {
    await page.goto('/');
    expect(await page.title()).toBeTruthy();
  });

  test('account page loads', async ({ page }) => {
    await page.goto('/account');
    expect(await page.title()).toBeTruthy();
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('links page requires authentication', async ({ page }) => {
    await page.goto('/links');
    // Should redirect to account/login or show auth UI
    await expect(page).toHaveURL(/\/account|\/login/, { timeout: 10_000 });
  });
});
