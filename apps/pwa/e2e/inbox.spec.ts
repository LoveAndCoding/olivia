import { expect, test } from '@playwright/test';

test('stakeholder can add and update an inbox item', async ({ page }) => {
  await page.goto('/');
  await expect(page.getByText('Showing last-known cached state while the API is unreachable.')).toHaveCount(0);
  await page.getByRole('link', { name: 'Add item' }).click();
  await page.getByLabel('Freeform input').fill('Add: schedule HVAC service, due next Friday, owner spouse');
  await page.getByRole('button', { name: 'Preview item' }).click();
  await expect(page.getByText('Confirm before save')).toBeVisible();
  await page.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(page.getByRole('heading', { name: 'schedule HVAC service' })).toBeVisible();
  await page.getByRole('button', { name: 'Preview status change' }).click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByText('Owner: spouse · Status: in progress')).toBeVisible();
});

test('spouse view stays read-only', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Active role').selectOption('spouse');
  await page.goto('/');
  await expect(page.getByRole('link', { name: 'Add item' })).toHaveCount(0);
  await page.goto('/add');
  await expect(page.getByText('read-only')).toBeVisible();
});

test('stakeholder can queue an item offline and sync it on reconnect', async ({ page, context }) => {
  await page.goto('/settings');
  await page.getByLabel('Active role').selectOption('stakeholder');
  await page.goto('/add');
  await context.setOffline(true);
  await page.getByLabel('Freeform input').fill('Add: replace smoke detector batteries, owner me');
  await page.getByRole('button', { name: 'Preview item' }).click();
  await page.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(page.getByText('Pending sync')).toBeVisible();
  await expect(page.getByText('Pending sync: 1')).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect
    .poll(async () => await page.locator('.status-bar').textContent(), { timeout: 10_000 })
    .toContain('Pending sync: 0');
  await page.goto('/');
  await expect(page.getByRole('main')).toContainText('replace smoke detector batteries');
});
