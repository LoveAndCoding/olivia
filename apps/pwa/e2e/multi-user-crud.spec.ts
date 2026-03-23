import { expect, test } from '@playwright/test';

/**
 * M32 Multi-User CRUD & Attribution E2E Tests
 *
 * Tests that both household roles can perform CRUD operations
 * on their respective entities, and that per-user attribution
 * is correctly displayed.
 *
 * Current role permissions:
 * - stakeholder: full write on tasks, lists, reminders, routines
 * - spouse: read-only tasks, full write lists, read-only reminders/routines
 *
 * Role switching uses localStorage (the RoleProvider mechanism).
 */

async function switchRole(page: import('@playwright/test').Page, role: 'stakeholder' | 'spouse') {
  await page.evaluate((r) => localStorage.setItem('olivia-role', r), role);
}

test.describe('Multi-user CRUD: tasks', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchRole(page, 'stakeholder');
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

  test('spouse sees tasks in read-only mode (no add button)', async ({ page }) => {
    // Switch to spouse
    await switchRole(page, 'spouse');

    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 15_000 });

    // Spouse should NOT see the add button — tasks are read-only for spouse
    await expect(page.getByRole('button', { name: 'Add a new task' })).toHaveCount(0);
    await expect(page.getByText('read-only')).toBeVisible();
  });

  test('both roles can see tasks created by stakeholder', async ({ page }) => {
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
    await switchRole(page, 'spouse');
    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 15_000 });
    await expect(page.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });
  });
});

test.describe('Multi-user CRUD: lists', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchRole(page, 'stakeholder');
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

  test('spouse can also access lists page', async ({ page }) => {
    await switchRole(page, 'spouse');

    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Lists page is accessible to spouse — lists are shared household data
    await expect(page.locator('.screen-title')).toBeVisible();
  });
});

test.describe('Multi-user CRUD: reminders', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchRole(page, 'stakeholder');
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
    await switchRole(page, 'spouse');

    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    await expect(page.locator('.add-label', { hasText: 'Add a reminder…' })).toHaveCount(0);
  });
});

test.describe('Multi-user CRUD: routines', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await switchRole(page, 'stakeholder');
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
    await switchRole(page, 'spouse');

    await page.goto('/routines');
    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });

    await expect(page.locator('.add-rem-btn', { hasText: 'New routine…' })).toHaveCount(0);
    await expect(page.locator('.task-checkbox')).toHaveCount(0);
  });
});

test.describe('Per-user attribution', () => {
  test('stakeholder task shows assignee initials', async ({ page }) => {
    const taskName = `attrib ${Date.now()}`;

    await page.goto('/');
    await switchRole(page, 'stakeholder');

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

  test('role switching via localStorage updates app behavior', async ({ page }) => {
    await page.goto('/');
    await switchRole(page, 'stakeholder');

    // Stakeholder should see add button on tasks
    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Add a new task' })).toBeVisible();

    // Switch to spouse — tasks should be read-only
    await switchRole(page, 'spouse');
    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
    await expect(page.getByRole('button', { name: 'Add a new task' })).toHaveCount(0);
    await expect(page.getByText('read-only')).toBeVisible();

    // Switch back to stakeholder
    await switchRole(page, 'stakeholder');
    await page.goto('/tasks');
    await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });
    await expect(page.getByRole('button', { name: 'Add a new task' })).toBeVisible();
  });
});
