import { expect, test } from '@playwright/test';

/**
 * M32 Navigation & Concurrency E2E Tests
 *
 * Navigation: verify ≤2 taps from home to reminders, routines, and meals.
 * Concurrency: two browser contexts editing simultaneously without corruption.
 */

const BASE_URL = 'http://127.0.0.1:4173';

test.describe('Navigation: ≤2 taps to key features', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

  test('home → reminders in ≤2 taps via UI clicks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });

    // Count taps needed to reach reminders
    let taps = 0;

    // Tap 1: check for direct link from home page
    const directLink = page.locator('a[href="/reminders"]').first();
    const hasDirectLink = await directLink.isVisible().catch(() => false);

    if (hasDirectLink) {
      await directLink.click();
      taps = 1;
    } else {
      // Tap 1: go to a section that links to reminders (e.g., nudge tray or weekly view)
      // Check for any clickable element that navigates to reminders
      const anyRemLink = page.locator('[href="/reminders"], [data-href="/reminders"]').first();
      const hasAny = await anyRemLink.isVisible().catch(() => false);
      if (hasAny) {
        await anyRemLink.click();
        taps = 1;
      } else {
        // No direct link from home — this means the ≤2 tap requirement is not met via UI
        // Mark as failing to surface this gap
        expect(hasAny, 'No UI path from home to reminders found — ≤2 tap requirement not met').toBe(true);
        return;
      }
    }

    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });
    expect(taps).toBeLessThanOrEqual(2);
  });

  test('home → routines in ≤2 taps via UI clicks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });

    let taps = 0;
    const directLink = page.locator('a[href="/routines"]').first();
    const hasDirectLink = await directLink.isVisible().catch(() => false);

    if (hasDirectLink) {
      await directLink.click();
      taps = 1;
    } else {
      const anyLink = page.locator('[href="/routines"], [data-href="/routines"]').first();
      const hasAny = await anyLink.isVisible().catch(() => false);
      if (hasAny) {
        await anyLink.click();
        taps = 1;
      } else {
        expect(hasAny, 'No UI path from home to routines found — ≤2 tap requirement not met').toBe(true);
        return;
      }
    }

    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });
    expect(taps).toBeLessThanOrEqual(2);
  });

  test('home → meals in ≤2 taps via UI clicks', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });

    let taps = 0;
    const directLink = page.locator('a[href="/meals"]').first();
    const hasDirectLink = await directLink.isVisible().catch(() => false);

    if (hasDirectLink) {
      await directLink.click();
      taps = 1;
    } else {
      const anyLink = page.locator('[href="/meals"], [data-href="/meals"]').first();
      const hasAny = await anyLink.isVisible().catch(() => false);
      if (hasAny) {
        await anyLink.click();
        taps = 1;
      } else {
        expect(hasAny, 'No UI path from home to meals found — ≤2 tap requirement not met').toBe(true);
        return;
      }
    }

    await expect(page.locator('.screen-title')).toContainText('Meals', { timeout: 10_000 });
    expect(taps).toBeLessThanOrEqual(2);
  });

  test('bottom nav provides 1-tap access to home, tasks, lists', async ({ page }) => {
    await page.goto('/tasks');
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
    await expect(page.locator('.bottom-nav')).toBeVisible();

    // Tap home
    await page.locator('.bottom-nav').getByLabel('Home').click();
    await expect(page.locator('.screen')).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL('/');

    // Tap lists
    await page.locator('.bottom-nav').getByLabel('Lists').click();
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Tap tasks
    await page.locator('.bottom-nav').getByLabel('Tasks').click();
    await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
  });
});

test.describe('Concurrency: simultaneous editing', () => {
  test('two browser contexts can create tasks concurrently', async ({ browser }) => {
    const taskA = `concurrent A ${Date.now()}`;
    const taskB = `concurrent B ${Date.now()}`;

    // Pass baseURL explicitly to new contexts (B4 fix)
    const contextA = await browser.newContext({ baseURL: BASE_URL });
    const contextB = await browser.newContext({ baseURL: BASE_URL });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Set up roles
      await pageA.goto('/settings');
      await expect(pageA.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
      await pageA.getByRole('button', { name: 'Lexi' }).click();

      await pageB.goto('/settings');
      await expect(pageB.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
      await pageB.getByRole('button', { name: 'Christian' }).click();

      // Both navigate to tasks concurrently
      await Promise.all([
        pageA.goto('/tasks'),
        pageB.goto('/tasks')
      ]);
      await Promise.all([
        expect(pageA.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 }),
        expect(pageB.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 })
      ]);

      // Context A creates a task
      await pageA.getByRole('button', { name: 'Add a new task' }).click();
      await pageA.getByPlaceholder('e.g. Call electrician').fill(taskA);
      await pageA.getByRole('button', { name: 'Preview' }).click();
      await expect(pageA.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });

      // Context B starts creating a task simultaneously
      const bAddButton = pageB.getByRole('button', { name: 'Add a new task' });
      await expect(bAddButton).toBeVisible({ timeout: 5_000 });
      await bAddButton.click();
      await pageB.getByPlaceholder('e.g. Call electrician').fill(taskB);
      await pageB.getByRole('button', { name: 'Preview' }).click();
      await expect(pageB.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });

      // Both confirm simultaneously
      await Promise.all([
        pageA.getByRole('button', { name: 'Confirm & save' }).click(),
        pageB.getByRole('button', { name: 'Confirm & save' }).click()
      ]);

      // Both should see their own task
      await expect(pageA.locator('.tf-name', { hasText: taskA })).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator('.tf-name', { hasText: taskB })).toBeVisible({ timeout: 10_000 });

      // After reload, both tasks visible to both contexts
      await Promise.all([pageA.reload(), pageB.reload()]);
      await Promise.all([
        expect(pageA.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 }),
        expect(pageB.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 })
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

  test('two contexts can add list items simultaneously', async ({ browser }) => {
    const listName = `Concurrent list ${Date.now()}`;

    const contextA = await browser.newContext({ baseURL: BASE_URL });
    const contextB = await browser.newContext({ baseURL: BASE_URL });
    const pageA = await contextA.newPage();
    const pageB = await contextB.newPage();

    try {
      // Set up stakeholder in A
      await pageA.goto('/settings');
      await expect(pageA.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
      await pageA.getByRole('button', { name: 'Lexi' }).click();

      // Context A creates a list
      await pageA.goto('/lists');
      await expect(pageA.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });
      await pageA.locator('.list-new-btn-label', { hasText: 'New list' }).click();
      await pageA.getByPlaceholder('Grocery run, Packing list…').fill(listName);
      await pageA.getByRole('button', { name: 'Create list' }).click();
      await expect(pageA.locator('.list-add-input')).toBeVisible({ timeout: 10_000 });

      // Add item from A
      await pageA.locator('.list-add-input').fill('Item from A');
      await pageA.locator('.list-add-input').press('Enter');
      await expect(pageA.locator('.list-item-text', { hasText: 'Item from A' })).toBeVisible({ timeout: 10_000 });

      // Context B opens the same list (use relative path from full URL)
      const listPath = new URL(pageA.url()).pathname;
      await pageB.goto('/settings');
      await expect(pageB.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
      await pageB.getByRole('button', { name: 'Lexi' }).click();
      await pageB.goto(listPath);
      await expect(pageB.locator('.list-add-input')).toBeVisible({ timeout: 10_000 });
      await expect(pageB.locator('.list-item-text', { hasText: 'Item from A' })).toBeVisible({ timeout: 10_000 });

      // Both add items simultaneously
      await Promise.all([
        (async () => {
          await pageA.locator('.list-add-input').fill('A second item');
          await pageA.locator('.list-add-input').press('Enter');
        })(),
        (async () => {
          await pageB.locator('.list-add-input').fill('Item from B');
          await pageB.locator('.list-add-input').press('Enter');
        })()
      ]);

      // Refresh both and verify all items present
      await Promise.all([pageA.reload(), pageB.reload()]);
      await Promise.all([
        expect(pageA.locator('.list-add-input')).toBeVisible({ timeout: 10_000 }),
        expect(pageB.locator('.list-add-input')).toBeVisible({ timeout: 10_000 })
      ]);

      // All items should be visible on both pages
      for (const p of [pageA, pageB]) {
        await expect(p.locator('.list-item-text', { hasText: 'Item from A' })).toBeVisible({ timeout: 10_000 });
        await expect(p.locator('.list-item-text', { hasText: 'A second item' })).toBeVisible({ timeout: 10_000 });
        await expect(p.locator('.list-item-text', { hasText: 'Item from B' })).toBeVisible({ timeout: 10_000 });
      }
    } finally {
      await contextA.close();
      await contextB.close();
    }
  });
});

test.describe('Single-user regression: no breakage', () => {
  test('home page loads without crash', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });
    await expect(page.locator('.bottom-nav')).toBeVisible();
  });

  test('settings page renders all sections', async ({ page }) => {
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await expect(page.getByText('Theme')).toBeVisible();
    await expect(page.getByText('Active role')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Lexi' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Christian' })).toBeVisible();
  });

  test('health check endpoint responds', async ({ request }) => {
    const res = await request.get('/api/health');
    expect(res.ok()).toBe(true);
  });
});
