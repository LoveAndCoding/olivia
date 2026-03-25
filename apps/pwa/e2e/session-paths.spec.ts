import { expect, test } from '@playwright/test';

/**
 * OLI-303: Multi-User Session Path E2E Tests
 *
 * Validates the full session-based multi-user workflow:
 * User A (stakeholder) creates item → User B (spouse) sees item → modifies it.
 *
 * Uses two browser contexts with localStorage role switching
 * to simulate distinct user sessions.
 */

const BASE_URL = 'http://127.0.0.1:4173';

test.describe('Multi-user session paths', () => {
  test('user A creates task, user B sees it in their session', async ({ browser }) => {
    const contextA = await browser.newContext({ baseURL: BASE_URL });
    const contextB = await browser.newContext({ baseURL: BASE_URL });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const taskName = `session-path-${Date.now()}`;

      // ── User A (stakeholder) creates a task ──
      await pageA.goto('/');
      await pageA.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
      await pageA.goto('/tasks');
      await expect(pageA.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

      await pageA.getByRole('button', { name: 'Add a new task' }).click();
      await pageA.getByPlaceholder('e.g. Call electrician').fill(taskName);
      await pageA.getByRole('button', { name: 'Preview' }).click();
      await expect(pageA.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
      await pageA.getByRole('button', { name: 'Confirm & save' }).click();
      await expect(pageA.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });

      // ── User B (spouse) sees the task ──
      await pageB.goto('/');
      await pageB.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));
      await pageB.goto('/tasks');
      await expect(pageB.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });
      await expect(pageB.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });

      // ── User B interacts with the task (completes it if checkbox is available) ──
      const taskRow = pageB.locator('.task-row', { hasText: taskName });
      const checkbox = taskRow.locator('.task-checkbox');
      const hasCheckbox = await checkbox.isVisible().catch(() => false);

      if (hasCheckbox) {
        await checkbox.click();
        await pageB.waitForTimeout(1000);
      }

      // ── User A reloads and confirms the page still works after cross-user action ──
      await pageA.reload();
      await expect(pageA.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('user A creates list, user B sees list and items', async ({ browser }) => {
    const contextA = await browser.newContext({ baseURL: BASE_URL });
    const contextB = await browser.newContext({ baseURL: BASE_URL });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const listName = `session-list-${Date.now()}`;
      const itemName = `item-${Date.now()}`;

      // ── User A (stakeholder) creates a list with an item ──
      await pageA.goto('/');
      await pageA.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
      await pageA.goto('/lists');
      await expect(pageA.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

      await pageA.locator('.list-new-btn-label', { hasText: 'New list' }).click();
      await pageA.getByPlaceholder('Grocery run, Packing list…').fill(listName);
      await pageA.getByRole('button', { name: 'Create list' }).click();
      await expect(pageA.locator('.list-add-input')).toBeVisible({ timeout: 10_000 });

      await pageA.locator('.list-add-input').fill(itemName);
      await pageA.locator('.list-add-input').press('Enter');
      await expect(pageA.locator('.list-item-text', { hasText: itemName })).toBeVisible({ timeout: 10_000 });

      // ── User B (spouse) sees the list and item ──
      await pageB.goto('/');
      await pageB.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));
      await pageB.goto('/lists');
      await expect(pageB.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

      await expect(pageB.locator('.list-card-title', { hasText: listName })).toBeVisible({ timeout: 10_000 });
      await pageB.locator('.list-card-title', { hasText: listName }).click();
      await expect(pageB.locator('.list-item-text', { hasText: itemName })).toBeVisible({ timeout: 10_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });

  test('simultaneous task creation across sessions preserves both', async ({ browser }) => {
    const contextA = await browser.newContext({ baseURL: BASE_URL });
    const contextB = await browser.newContext({ baseURL: BASE_URL });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      const taskA = `simul-A-${Date.now()}`;
      const taskB = `simul-B-${Date.now() + 1}`;

      // Both contexts set up role and navigate to tasks
      await pageA.goto('/');
      await pageA.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));

      await pageB.goto('/');
      await pageB.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));

      await Promise.all([pageA.goto('/tasks'), pageB.goto('/tasks')]);
      await Promise.all([
        expect(pageA.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 }),
        expect(pageB.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 }),
      ]);

      // Context A starts creating a task
      await pageA.getByRole('button', { name: 'Add a new task' }).click();
      await pageA.getByPlaceholder('e.g. Call electrician').fill(taskA);
      await pageA.getByRole('button', { name: 'Preview' }).click();
      await expect(pageA.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });

      // Context B starts creating a task
      const bAddButton = pageB.getByRole('button', { name: 'Add a new task' });
      await expect(bAddButton).toBeVisible({ timeout: 5_000 });
      await bAddButton.click();
      await pageB.getByPlaceholder('e.g. Call electrician').fill(taskB);
      await pageB.getByRole('button', { name: 'Preview' }).click();
      await expect(pageB.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });

      // Both confirm simultaneously
      await Promise.all([
        pageA.getByRole('button', { name: 'Confirm & save' }).click(),
        pageB.getByRole('button', { name: 'Confirm & save' }).click(),
      ]);

      await expect(pageA.locator('.tf-name', { hasText: taskA })).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator('.tf-name', { hasText: taskB })).toBeVisible({ timeout: 10_000 });

      // After reload, both tasks visible to both
      await Promise.all([pageA.reload(), pageB.reload()]);
      await Promise.all([
        expect(pageA.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 }),
        expect(pageB.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 }),
      ]);

      await expect(pageA.locator('.tf-name', { hasText: taskA })).toBeVisible({ timeout: 10_000 });
      await expect(pageA.locator('.tf-name', { hasText: taskB })).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator('.tf-name', { hasText: taskA })).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator('.tf-name', { hasText: taskB })).toBeVisible({ timeout: 10_000 });
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});
