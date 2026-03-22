import { expect, test } from '@playwright/test';

test.describe('Settings page', () => {
  test('settings page renders all sections', async ({ page }) => {
    await page.goto('/settings');

    // Verify page title
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await expect(page.locator('.screen-sub').first()).toContainText('App preferences');

    // Theme section
    await expect(page.getByText('Theme')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Light' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Dark' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Auto (OS)' })).toBeVisible();

    // Active role section
    await expect(page.getByText('Active role')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lexi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Christian' })).toBeVisible();

    // Notifications section
    await expect(page.locator('.screen-title').filter({ hasText: 'Notifications' })).toBeVisible();

    // Sync diagnostics section
    await expect(page.getByText('Sync diagnostics')).toBeVisible();
    await expect(page.getByText('Pending commands:')).toBeVisible();
  });

  test('theme selection persists and applies to the page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

    // Click Light theme
    await page.getByRole('button', { name: 'Light' }).click();

    // The Light button should now be the active (primary) button
    await expect(page.getByRole('button', { name: 'Light' })).toHaveClass(/primary-button/);

    // The document should have data-theme="light"
    const theme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(theme).toBe('light');

    // Navigate away and back — theme should persist
    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

    // Theme should still be light
    const persistedTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(persistedTheme).toBe('light');
    await expect(page.getByRole('button', { name: 'Light' })).toHaveClass(/primary-button/);

    // Switch to Dark
    await page.getByRole('button', { name: 'Dark' }).click();
    const darkTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(darkTheme).toBe('dark');
    await expect(page.getByRole('button', { name: 'Dark' })).toHaveClass(/primary-button/);

    // Switch to Auto — should remove data-theme attribute
    await page.getByRole('button', { name: 'Auto (OS)' }).click();
    const autoTheme = await page.evaluate(() => document.documentElement.getAttribute('data-theme'));
    expect(autoTheme).toBeNull();
  });

  test('role switching changes current role display', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

    // Switch to stakeholder (Lexi)
    await page.getByRole('button', { name: 'Lexi' }).click();
    await expect(page.getByText('Current: Lexi (stakeholder)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lexi' })).toHaveClass(/primary-button/);

    // Switch to spouse (Christian)
    await page.getByRole('button', { name: 'Christian' }).click();
    await expect(page.getByText('Current: Christian (spouse)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Christian' })).toHaveClass(/primary-button/);
  });

  test('role switch to spouse makes tasks page read-only (regression OLI-177)', async ({ page }) => {
    // Switch to spouse
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Christian' }).click();
    await expect(page.getByText('Current: Christian (spouse)')).toBeVisible();

    // Navigate to tasks — should be read-only
    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Add a new task' })).toHaveCount(0);
    await expect(page.getByText('read-only')).toBeVisible();

    // Switch back to stakeholder
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

  test('notification toggles are interactive', async ({ page }) => {
    // Ensure stakeholder role for notification settings
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();

    // Notification section should be visible
    await expect(page.locator('.screen-title').filter({ hasText: 'Notifications' })).toBeVisible();

    // Master toggle should exist
    const masterToggle = page.getByLabel('Toggle push notifications');
    await expect(masterToggle).toBeVisible();

    // Sub-toggles should exist
    await expect(page.getByLabel('Toggle due reminders')).toBeVisible();
    await expect(page.getByLabel('Toggle daily summary')).toBeVisible();

    // Notification type labels should be visible
    await expect(page.getByText('Due reminders')).toBeVisible();
    await expect(page.getByText('Daily summary')).toBeVisible();

    // Olivia's contextual message about notifications should be visible
    await expect(page.locator('.omsg')).toBeVisible({ timeout: 5_000 });
  });

  test('back button navigates to home', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

    // Click the back button
    await page.getByLabel('Back to Home').click();

    // Should navigate to home
    await expect(page).toHaveURL('/', { timeout: 5_000 });
  });
});
