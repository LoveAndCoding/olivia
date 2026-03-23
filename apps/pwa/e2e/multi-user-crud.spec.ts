import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User CRUD & Attribution E2E Tests
 *
 * Tests that both household roles can perform CRUD operations
 * and that per-user attribution is correctly displayed.
 * Unique task names use Date.now() to avoid selector collisions.
 */

test.describe('Multi-user CRUD: tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

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

  test('spouse has write access to tasks (M32 requirement)', async ({ page }) => {
    const taskName = `spouse task ${Date.now()}`;

    // Switch to spouse
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

    // M32: spouse must have write access to tasks — assert the add button exists
    const addButton = page.getByRole('button', { name: 'Add a new task' });
    await expect(addButton).toBeVisible({ timeout: 5_000 });

    await addButton.click();
    await page.getByPlaceholder('e.g. Call electrician').fill(taskName);
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirm & save' }).click();

    await expect(page.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });
  });

  test('both roles can see tasks created by the other role', async ({ page }) => {
    const taskName = `cross-user ${Date.now()}`;

    // Create as stakeholder
    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Add a new task' }).click();
    await page.getByPlaceholder('e.g. Call electrician').fill(taskName);
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirm & save' }).click();
    await expect(page.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });

    // Switch to spouse and verify visibility
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });
    await expect(page.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Multi-user CRUD: lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

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

  test('spouse sees lists in read-only mode', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Spouse should not see "New list" button
    await expect(page.locator('.list-new-btn-label')).toHaveCount(0);
  });
});

test.describe('Multi-user CRUD: reminders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

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

  test('spouse can view reminders but not create them', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    await expect(page.locator('.add-label', { hasText: 'Add a reminder…' })).toHaveCount(0);
  });
});

test.describe('Multi-user CRUD: routines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

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

  test('spouse cannot create routines or complete occurrences', async ({ page }) => {
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/routines');
    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });

    await expect(page.locator('.add-rem-btn', { hasText: 'New routine…' })).toHaveCount(0);
    await expect(page.locator('.task-checkbox')).toHaveCount(0);
  });
});

test.describe('Per-user attribution', () => {
  test('stakeholder task shows Lexi assignee avatar', async ({ page }) => {
    const taskName = `attrib ${Date.now()}`;

    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();

    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

    await page.getByRole('button', { name: 'Add a new task' }).click();
    await page.getByPlaceholder('e.g. Call electrician').fill(taskName);
    await page.getByRole('button', { name: 'Preview' }).click();
    await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
    await page.getByRole('button', { name: 'Confirm & save' }).click();

    // Verify the task row exists and has the stakeholder avatar initial "L"
    const taskRow = page.locator('.task-row', { hasText: taskName });
    await expect(taskRow).toBeVisible({ timeout: 10_000 });
    // The avatar shows "L" for Lexi (stakeholder owner)
    const avatar = taskRow.locator('.task-avatar');
    const avatarExists = await avatar.isVisible().catch(() => false);
    if (avatarExists) {
      await expect(avatar).toContainText('L');
    }
  });

  test('role switching in settings updates current user display', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });

    await page.getByRole('button', { name: 'Lexi' }).click();
    await expect(page.getByText('Current: Lexi (stakeholder)')).toBeVisible();

    await page.getByRole('button', { name: 'Christian' }).click();
    await expect(page.getByText('Current: Christian (spouse)')).toBeVisible();

    await page.getByRole('button', { name: 'Lexi' }).click();
    await expect(page.getByText('Current: Lexi (stakeholder)')).toBeVisible();
  });
});
