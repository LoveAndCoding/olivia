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

    // Household section
    await expect(page.getByText('Household')).toBeVisible();

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

  test('spouse role makes tasks page read-only (regression OLI-177)', async ({ page }) => {
    // Set spouse role via localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));
    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Add a new task' })).toHaveCount(0);
    await expect(page.getByText('read-only')).toBeVisible();

    // Restore stakeholder role
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });

  test('notification toggles are interactive', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

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

  test('back button navigates to More', async ({ page }) => {
    // Navigate to /more first so history.back() has somewhere to go
    await page.goto('/more');
    await expect(page.locator('.screen-title').first()).toContainText('More', { timeout: 10_000 });

    // Navigate to settings from More
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

    // Click the back button (uses history.back())
    await page.getByLabel('Go back').click();

    // Should navigate to /more
    await expect(page).toHaveURL(/\/more/, { timeout: 5_000 });
  });
});
