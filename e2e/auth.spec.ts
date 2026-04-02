import { expect, test } from '@playwright/test';

const TEST_EMAIL = 'e2e-user@integration-test.invalid';
const TEST_PASSWORD = 'testpassword123';
const REGISTER_EMAIL = `e2e-register-${Date.now()}@integration-test.invalid`;

test.describe('Authentication', () => {
  test('login page loads with email input', async ({ page }) => {
    await page.goto('/account');
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/account');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', 'wrongpassword');
    await page.click('button[type="submit"]');

    await expect(
      page.locator('[role="alert"], .error, [class*="error"]'),
    ).toBeVisible({ timeout: 5_000 });
  });

  test('login with valid credentials redirects to links', async ({ page }) => {
    await page.goto('/account');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');

    await expect(page).toHaveURL(/\/links/, { timeout: 10_000 });
  });

  test('logout returns to account page', async ({ page }) => {
    // Login first
    await page.goto('/account');
    await page.fill('input[type="email"]', TEST_EMAIL);
    await page.fill('input[type="password"]', TEST_PASSWORD);
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/links/, { timeout: 10_000 });

    // Find and click logout
    await page.click(
      'button:has-text("Logout"), [aria-label="Logout"], a:has-text("Logout"), button:has-text("Log out"), a:has-text("Log out")',
    );
    await expect(page).toHaveURL(/\/account/, { timeout: 10_000 });
  });
});
