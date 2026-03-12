import { expect, test } from '@playwright/test';

test('stakeholder can add and update an inbox item', async ({ page }) => {
  const title = `schedule HVAC service ${Date.now()}`;
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Add a new task...' }).click();
  await page.getByLabel('Freeform input').fill(`Add: ${title}, due next Friday, owner spouse`);
  await page.getByRole('button', { name: 'Preview item' }).click();
  await expect(page.getByRole('heading', { name: 'Preview before save' })).toBeVisible();
  await page.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(page.getByRole('link', { name: new RegExp(title, 'i') })).toBeVisible();
  await page.getByRole('link', { name: new RegExp(title, 'i') }).click();
  await expect(page.getByRole('heading', { name: title })).toBeVisible();
  await page.getByLabel('Status').selectOption('in_progress');
  await page.getByRole('button', { name: 'Preview status change' }).click();
  await page.getByRole('button', { name: 'Confirm change' }).click();
  await expect(page.getByText('Owner: spouse · Status: in progress')).toBeVisible();
});

test('spouse view stays read-only', async ({ page }) => {
  await page.goto('/settings');
  await page.getByLabel('Active role').selectOption('spouse');
  await page.goto('/tasks');
  await expect(page.getByRole('button', { name: 'Add a new task...' })).toHaveCount(0);
  await expect(page.getByText('view-only')).toBeVisible();
  await page.goto('/add');
  await expect(page.getByText('read-only')).toBeVisible();
});

test('stakeholder can queue an item offline and sync it on reconnect', async ({ page, context }) => {
  const title = `replace smoke detector batteries ${Date.now()}`;
  await page.goto('/settings');
  await page.getByLabel('Active role').selectOption('stakeholder');
  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Add a new task...' }).click();
  await context.setOffline(true);
  await page.getByLabel('Freeform input').fill(`Add: ${title}, owner me`);
  await page.getByRole('button', { name: 'Preview item' }).click();
  await page.getByRole('button', { name: 'Confirm and save' }).click();
  await expect(page.getByText('Pending sync')).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await page.goto('/tasks');
  const syncedTask = page.getByRole('link', { name: new RegExp(title, 'i') });
  await expect(syncedTask).toBeVisible();
  await expect.poll(async () => await syncedTask.textContent(), { timeout: 15_000 }).not.toContain('Pending sync');
});
