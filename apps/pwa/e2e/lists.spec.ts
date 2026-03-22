import { expect, test } from '@playwright/test';

test.describe('List lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure stakeholder role
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

  test('stakeholder can create a list', async ({ page }) => {
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // Open create sheet
    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();

    // Fill title
    await page.getByPlaceholder('Grocery run, Packing list…').fill('Weekend errands');

    // Submit
    await page.getByRole('button', { name: 'Create list' }).click();

    // Verify the list appears
    await expect(page.locator('.list-card-title', { hasText: 'Weekend errands' })).toBeVisible({ timeout: 10_000 });
  });

  test('stakeholder can add items to a list and check/uncheck them', async ({ page }) => {
    // First ensure a list exists by creating one
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill('Checklist test');
    await page.getByRole('button', { name: 'Create list' }).click();
    await expect(page.locator('.list-card-title', { hasText: 'Checklist test' })).toBeVisible({ timeout: 10_000 });

    // Navigate to the list detail
    await page.locator('.list-card-title', { hasText: 'Checklist test' }).click();

    // Add an item
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

    // Verify it becomes checked (aria-label changes to "Uncheck item")
    await expect(page.locator('[aria-label="Uncheck item"]').first()).toBeVisible({ timeout: 5_000 });

    // The text should have the checked class (strikethrough)
    await expect(page.locator('.list-item-text.checked').first()).toBeVisible({ timeout: 5_000 });

    // Uncheck it
    await page.locator('[aria-label="Uncheck item"]').first().click();
    await expect(page.locator('[aria-label="Check item"]').first()).toBeVisible({ timeout: 5_000 });
  });

  test('stakeholder can archive a list via overflow menu', async ({ page }) => {
    // Create a list to archive
    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    await page.locator('.list-new-btn-label', { hasText: 'New list' }).click();
    await page.getByPlaceholder('Grocery run, Packing list…').fill('Archive me');
    await page.getByRole('button', { name: 'Create list' }).click();
    await expect(page.locator('.list-card-title', { hasText: 'Archive me' })).toBeVisible({ timeout: 10_000 });

    // Open overflow menu on that card
    const card = page.locator('.list-card', { hasText: 'Archive me' });
    await card.locator('[aria-label="List options"]').click();

    // Click Archive option in the overflow menu
    await page.getByRole('button', { name: 'Archive' }).click();

    // Confirm archive in the sheet
    await page.getByRole('button', { name: 'Archive' }).click();

    // Should show "Archived" banner
    await expect(page.getByText('Archived')).toBeVisible({ timeout: 10_000 });

    // The list should no longer appear in the active tab
    await expect(page.locator('.list-card-title', { hasText: 'Archive me' })).not.toBeVisible({ timeout: 5_000 });

    // Switch to archived tab — it should be there
    await page.locator('.ftab', { hasText: 'Archived' }).click();
    await expect(page.locator('.list-card-title', { hasText: 'Archive me' })).toBeVisible({ timeout: 10_000 });
  });

  test('spouse view is read-only on lists page', async ({ page }) => {
    // Switch to spouse
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/lists');
    await expect(page.locator('.screen-title')).toContainText('Lists', { timeout: 10_000 });

    // No "New list" button for spouse
    await expect(page.locator('.list-new-btn-label')).toHaveCount(0);

    // Switch back to stakeholder
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Lexi' }).click();
  });
});
