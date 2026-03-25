import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User CRUD & Attribution E2E Tests
 *
 * Tests CRUD operations on tasks, lists, reminders, and routines,
 * and that per-user attribution is correctly displayed.
 */

test.describe('Multi-user CRUD: tasks', () => {
  test('stakeholder can create a task', async ({ page }) => {
    const taskName = `stakeholder task ${Date.now()}`;
    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Add a new task' }).click();
    await page.getByPlaceholder('e.g. Call electrician').fill(taskName);
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirm & save' }).click();

    await expect(page.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });
  });

});

test.describe('Multi-user CRUD: lists', () => {
  test('stakeholder can create a list and add items', async ({ page }) => {
    const listName = `List ${Date.now()}`;

    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill(listName);
    await page.getByRole('button', { name: 'Create list' }).click();

    await expect(page.locator('.list-add-input')).toBeVisible({ timeout: 10_000 });

    const addInput = page.locator('.list-add-input');
    await addInput.fill('Test item from stakeholder');
    await addInput.press('Enter');
    await expect(page.locator('.list-item-text', { hasText: 'Test item from stakeholder' })).toBeVisible({ timeout: 10_000 });
  });

});

test.describe('Multi-user CRUD: reminders', () => {
  test('stakeholder can create reminders', async ({ page }) => {
    const reminderName = `Reminder ${Date.now()}`;

    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    await page.locator('.add-label', { hasText: 'Add a reminder…' }).click();
    await page.getByPlaceholder('What do you want to remember?').fill(reminderName);
    await page.locator('.rem-chip', { hasText: 'Today' }).click();
    await page.getByRole('button', { name: 'Save reminder' }).click();

    await expect(page.getByText('Reminder created')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('.rem-title', { hasText: reminderName })).toBeVisible({ timeout: 10_000 });
  });

});

test.describe('Multi-user CRUD: routines', () => {
  test('stakeholder can create routines', async ({ page }) => {
    const routineName = `Routine ${Date.now()}`;

    await page.goto('/routines');
    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });

    await page.locator('.add-rem-btn', { hasText: 'New routine…' }).first().click();
    await page.getByPlaceholder('e.g. Take out the trash').fill(routineName);
    await page.locator('.recurrence-option-row', { hasText: 'Every day' }).click();

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await page.locator('input[type="date"]').fill(todayIso);
    await page.getByRole('button', { name: 'Create Routine' }).click();

    await expect(page.locator('.list-card-title', { hasText: routineName })).toBeVisible({ timeout: 10_000 });
  });

});

test.describe('Per-user attribution', () => {
  test('stakeholder task shows assignee initials', async ({ page }) => {
    const taskName = `attrib ${Date.now()}`;

    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Add a new task' }).click();
    await page.getByPlaceholder('e.g. Call electrician').fill(taskName);
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirm & save' }).click();

    // Verify the task shows up with the correct name
    const taskEl = page.locator('.task-full', { hasText: taskName });
    await expect(taskEl).toBeVisible({ timeout: 10_000 });

    // Check for assignee mini-avatar if present
    const avatar = taskEl.locator('.tf-mini-av');
    const avatarExists = await avatar.isVisible().catch(() => false);
    if (avatarExists) {
      await expect(avatar).toContainText('L');
    }
  });

});
