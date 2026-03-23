import { expect, test } from '@playwright/test';

test.describe('List lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure stakeholder role via localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });

  test('stakeholder can create a list', async ({ page }) => {
    const listName = `Weekend errands ${Date.now()}`;
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Open create sheet
    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();

    // Fill title
    await page.getByPlaceholder('Grocery run, Packing list…').fill(listName);

    // Submit
    await page.getByRole('button', { name: 'Create list' }).click();

    // After creation, the app navigates to the list detail page.
    // Verify we land on the detail page with the add-item input visible.
    await expect(page.locator('.list-add-input')).toBeVisible({ timeout: 10_000 });

    // Navigate back to the lists index and verify the card appears
    await page.goto('/lists');
    await expect(page.locator('.list-card-title', { hasText: listName })).toBeVisible({ timeout: 10_000 });
  });

  test('stakeholder can add items to a list and check/uncheck them', async ({ page }) => {
    // Create a list — the app navigates to detail page after creation
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill(`Checklist ${Date.now()}`);
    await page.getByRole('button', { name: 'Create list' }).click();

    // Already on the detail page after creation
    const addInput = page.locator('.list-add-input');
    await expect(addInput).toBeVisible({ timeout: 10_000 });
    await addInput.fill('Buy milk');
    await addInput.press('Enter');

    // Verify the item appears
    await expect(page.locator('.list-item-text', { hasText: 'Buy milk' })).toBeVisible({ timeout: 10_000 });

    // Add a second item
    await addInput.fill('Pick up laundry');
    await addInput.press('Enter');
    await expect(page.locator('.list-item-text', { hasText: 'Pick up laundry' })).toBeVisible({ timeout: 10_000 });

    // Check the first item
    const firstCheckbox = page.locator('[aria-label="Check item"]').first();
    await firstCheckbox.click();

    // Checked items move to a collapsed "Completed" section — expand it
    await expect(page.locator('.list-completed-header')).toBeVisible({ timeout: 5_000 });
    await page.locator('.list-completed-header').click();

    // Verify it becomes checked (aria-label changes to "Uncheck item")
    await expect(page.locator('[aria-label="Uncheck item"]').first()).toBeVisible({ timeout: 5_000 });

    // The text should have the checked class (strikethrough)
    await expect(page.locator('.list-item-text.checked').first()).toBeVisible({ timeout: 5_000 });

    // Uncheck it
    await page.locator('[aria-label="Uncheck item"]').first().click();
    await expect(page.locator('[aria-label="Check item"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('stakeholder can archive a list via overflow menu', async ({ page }) => {
    const listName = `Archive me ${Date.now()}`;
    // Create a list — the app navigates to detail page after creation
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill(listName);
    await page.getByRole('button', { name: 'Create list' }).click();

    // Navigate back to lists index after creation redirects to detail
    await page.goto('/lists');
    await expect(page.locator('.list-card-title', { hasText: listName })).toBeVisible({ timeout: 10_000 });

    // Open overflow menu on that card
    const card = page.locator('.list-card', { hasText: listName });
    await card.locator('[aria-label="List options"]').click();

    // Click Archive option in the overflow menu
    await page.locator('.list-overflow-item', { hasText: 'Archive' }).click();

    // Confirm archive in the sheet
    await page.locator('.cancel-actions .rem-btn-secondary', { hasText: 'Archive' }).click();

    // Should show "Archived" confirmation banner
    await expect(page.locator('.confirm-banner', { hasText: 'Archived' })).toBeVisible({ timeout: 10_000 });

    // The list should no longer appear in the active tab
    await expect(page.locator('.list-card-title', { hasText: listName })).not.toBeVisible({ timeout: 5_000 });

    // Switch to archived tab — it should be there
    await page.locator('.ftab', { hasText: 'Archived' }).click();
    await expect(page.locator('.list-card-title', { hasText: listName })).toBeVisible({ timeout: 10_000 });
  });

  test('spouse can access lists page with write access (OLI-283)', async ({ page }) => {
    // Switch to spouse via localStorage — OLI-283 granted spouse write access
    await page.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Spouse now has write access — "New list" button should be visible
    await expect(page.locator('.list-new-btn-label')).toBeVisible();

    // Restore stakeholder role
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });
});
