import { expect, test } from '@playwright/test';

/**
 * E2E tests for lists completed-item management (spec: OLI-247).
 *
 * Covers acceptance criteria:
 * - AC1: Completed section with "Completed (N)" header
 * - AC2: Completed section collapsed by default
 * - AC3: Expand/collapse on header tap
 * - AC4: Checking an item moves it to completed section
 * - AC5: Unchecking a completed item moves it back
 * - AC6: "Clear completed" confirmation with count
 * - AC7: Clear completed removes checked items
 * - AC8: "Uncheck all" confirmation with count
 * - AC9: Uncheck all returns items to unchecked state
 * - AC11: Spouse cannot access bulk actions
 * - AC12: No completed section when no items are checked
 */

/** Create a list with items and check some of them. After creation the app
 *  auto-navigates to the detail page, so we work directly there. */
async function setupListWithCheckedItems(
  page: import('@playwright/test').Page,
  listName: string,
  items: string[],
  checkIndices: number[]
) {
  await page.goto('/lists');
  await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

  // Create list — app auto-navigates to detail page
  await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
  await page.getByPlaceholder('Grocery run, Packing list…').fill(listName);
  await page.getByRole('button', { name: 'Create list' }).click();

  // Already on the detail page after creation
  const addInput = page.locator('.list-add-input');
  await expect(addInput).toBeVisible({ timeout: 10_000 });

  // Add items
  for (const item of items) {
    await addInput.fill(item);
    await addInput.press('Enter');
    await expect(page.locator('.list-item-text', { hasText: item })).toBeVisible({ timeout: 10_000 });
  }

  // Check specified items
  for (let i = 0; i < checkIndices.length; i++) {
    const checkboxes = page.locator('[aria-label="Check item"]');
    await checkboxes.nth(0).click(); // Always click first unchecked item since checked items move away
    await page.waitForTimeout(300); // Wait for optimistic update
  }
}

test.describe('Completed-item management', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure stakeholder role via localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });

  test('AC12: no completed section when no items are checked', async ({ page }) => {
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Create a list — app auto-navigates to detail page
    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill('No checked items');
    await page.getByRole('button', { name: 'Create list' }).click();

    // Already on the detail page
    const addInput = page.locator('.list-add-input');
    await expect(addInput).toBeVisible({ timeout: 10_000 });
    await addInput.fill('Unchecked item');
    await addInput.press('Enter');
    await expect(page.locator('.list-item-text', { hasText: 'Unchecked item' })).toBeVisible({ timeout: 10_000 });

    // No completed section should appear
    await expect(page.locator('.list-completed-section')).toHaveCount(0);

    // Overflow menu should not have bulk actions
    await page.locator('[aria-label="List options"]').click();
    await expect(page.getByRole('button', { name: 'Clear completed' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Uncheck all' })).toHaveCount(0);
  });

  test('AC1+AC2: completed section appears collapsed with count when items are checked', async ({ page }) => {
    await setupListWithCheckedItems(page, 'Completed section test', ['Milk', 'Bread', 'Eggs'], [0]);

    // Completed section should appear
    const completedHeader = page.locator('.list-completed-header');
    await expect(completedHeader).toBeVisible({ timeout: 5_000 });

    // Should show "Completed (1)"
    await expect(page.locator('.list-completed-label')).toContainText('Completed (1)');

    // Section should be collapsed by default (aria-expanded=false)
    await expect(completedHeader).toHaveAttribute('aria-expanded', 'false');

    // Completed items should not be visible when collapsed
    await expect(page.locator('.list-completed-items')).toHaveCount(0);
  });

  test('AC3: tapping the header expands and collapses the completed section', async ({ page }) => {
    await setupListWithCheckedItems(page, 'Expand collapse test', ['Milk', 'Bread'], [0]);

    const completedHeader = page.locator('.list-completed-header');
    await expect(completedHeader).toBeVisible({ timeout: 5_000 });

    // Expand
    await completedHeader.click();
    await expect(completedHeader).toHaveAttribute('aria-expanded', 'true');
    await expect(page.locator('.list-completed-items')).toBeVisible({ timeout: 5_000 });

    // Collapse
    await completedHeader.click();
    await expect(completedHeader).toHaveAttribute('aria-expanded', 'false');
    await expect(page.locator('.list-completed-items')).toHaveCount(0);
  });

  test('AC4: checking an item moves it to the completed section', async ({ page }) => {
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Create list — app auto-navigates to detail page
    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill('Check move test');
    await page.getByRole('button', { name: 'Create list' }).click();

    // Already on the detail page
    const addInput = page.locator('.list-add-input');
    await expect(addInput).toBeVisible({ timeout: 10_000 });
    await addInput.fill('Item A');
    await addInput.press('Enter');
    await addInput.fill('Item B');
    await addInput.press('Enter');
    await expect(page.locator('.list-item-text', { hasText: 'Item B' })).toBeVisible({ timeout: 10_000 });

    // No completed section yet
    await expect(page.locator('.list-completed-section')).toHaveCount(0);

    // Check Item A
    await page.locator('[aria-label="Check item"]').first().click();

    // Completed section appears
    await expect(page.locator('.list-completed-header')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.list-completed-label')).toContainText('Completed (1)');
  });

  test('AC5: unchecking a completed item moves it back to the main section', async ({ page }) => {
    await setupListWithCheckedItems(page, 'Uncheck move test', ['Milk', 'Bread'], [0]);

    // Expand completed section
    const completedHeader = page.locator('.list-completed-header');
    await expect(completedHeader).toBeVisible({ timeout: 5_000 });
    await completedHeader.click();

    // Find the uncheck button within the completed section and click it
    await page.locator('.list-completed-items [aria-label="Uncheck item"]').first().click();

    // Completed section should disappear (no more checked items)
    await expect(page.locator('.list-completed-section')).toHaveCount(0, { timeout: 5_000 });

    // Both items should be back in the main section as unchecked
    const uncheckedCheckboxes = page.locator('.list-detail-items [aria-label="Check item"]');
    await expect(uncheckedCheckboxes).toHaveCount(2, { timeout: 5_000 });
  });

  test('AC6+AC7: clear completed shows confirmation and removes checked items', async ({ page }) => {
    await setupListWithCheckedItems(page, 'Clear completed test', ['Milk', 'Bread', 'Eggs'], [0, 1]);

    // Completed section should show count of 2
    await expect(page.locator('.list-completed-label')).toContainText('Completed (2)', { timeout: 5_000 });

    // Open overflow menu
    await page.locator('[aria-label="List options"]').click();

    // Click "Clear completed"
    await page.getByRole('button', { name: 'Clear completed' }).click();

    // Confirmation dialog should appear with item count
    await expect(page.getByText('Remove 2 completed items? This cannot be undone.')).toBeVisible({ timeout: 5_000 });

    // Confirm
    await page.getByRole('button', { name: 'Clear completed' }).click();

    // Completed section should disappear
    await expect(page.locator('.list-completed-section')).toHaveCount(0, { timeout: 5_000 });

    // Success banner
    await expect(page.getByText('Cleared')).toBeVisible({ timeout: 5_000 });

    // Only the unchecked item should remain
    await expect(page.locator('.list-detail-items .list-item-text')).toHaveCount(1, { timeout: 5_000 });
  });

  test('AC8+AC9: uncheck all shows confirmation and returns items to unchecked state', async ({ page }) => {
    await setupListWithCheckedItems(page, 'Uncheck all test', ['Milk', 'Bread', 'Eggs'], [0, 1]);

    // Completed section should show count of 2
    await expect(page.locator('.list-completed-label')).toContainText('Completed (2)', { timeout: 5_000 });

    // Open overflow menu
    await page.locator('[aria-label="List options"]').click();

    // Click "Uncheck all"
    await page.getByRole('button', { name: 'Uncheck all' }).click();

    // Confirmation dialog should appear with item count
    await expect(page.getByText(/Uncheck all 2 completed items\?/)).toBeVisible({ timeout: 5_000 });

    // Confirm
    await page.getByRole('button', { name: 'Uncheck all' }).click();

    // Completed section should disappear
    await expect(page.locator('.list-completed-section')).toHaveCount(0, { timeout: 5_000 });

    // Success banner
    await expect(page.getByText('Items unchecked')).toBeVisible({ timeout: 5_000 });

    // All 3 items should be in the main section as unchecked
    const uncheckedCheckboxes = page.locator('.list-detail-items [aria-label="Check item"]');
    await expect(uncheckedCheckboxes).toHaveCount(3, { timeout: 5_000 });
  });

  test('AC11: spouse cannot access clear completed or uncheck all', async ({ page }) => {
    // First, create a list with checked items as stakeholder
    await setupListWithCheckedItems(page, 'Spouse restriction test', ['Milk', 'Bread'], [0]);

    // Verify completed section is visible
    await expect(page.locator('.list-completed-header')).toBeVisible({ timeout: 5_000 });

    // Switch to spouse via localStorage
    await page.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Look for the list we created
    const listCard = page.locator('.list-card-title', { hasText: 'Spouse restriction test' });
    if (await listCard.isVisible({ timeout: 5_000 })) {
      await listCard.click();

      // Spouse should NOT see the overflow menu button at all
      await expect(page.locator('[aria-label="List options"]')).toHaveCount(0);
    }

    // Restore stakeholder role
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });

  test('bulk actions hidden in overflow menu when no checked items exist', async ({ page }) => {
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Create list — app auto-navigates to detail page
    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill('Overflow menu test');
    await page.getByRole('button', { name: 'Create list' }).click();

    // Already on the detail page
    const addInput = page.locator('.list-add-input');
    await expect(addInput).toBeVisible({ timeout: 10_000 });
    await addInput.fill('Test item');
    await addInput.press('Enter');
    await expect(page.locator('.list-item-text', { hasText: 'Test item' })).toBeVisible({ timeout: 10_000 });

    // Open overflow menu — should NOT have bulk actions
    await page.locator('[aria-label="List options"]').click();
    await expect(page.getByRole('button', { name: 'Rename' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Clear completed' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Uncheck all' })).toHaveCount(0);
  });
});
