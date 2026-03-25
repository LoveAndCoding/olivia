import { expect, test } from '@playwright/test';

test.describe('Routine lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure stakeholder role via localStorage
    await page.goto('/');
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });

  test('stakeholder can create a routine with weekly recurrence', async ({ page }) => {
    const routineName = `Water garden ${Date.now()}`;
    await page.goto('/routines');
    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });

    // Open create sheet — first() needed because empty-state has a second button
    await page.locator('.add-rem-btn', { hasText: 'New routine…' }).first().click();

    // Fill the form
    await page.getByPlaceholder('e.g. Take out the trash').fill(routineName);
    // Owner defaults to stakeholder — leave it
    // Select recurrence via radio button (exact label to avoid matching "Weekly on specific days")
    await page.locator('.recurrence-option-row', { hasText: 'Every week on a day' }).click();

    // Set first due date to today
    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
    await page.locator('input[type="date"]').fill(todayIso);

    // Submit
    await page.getByRole('button', { name: 'Create Routine' }).click();

    // Verify the routine appears in the list
    await expect(page.locator('.list-card-title', { hasText: routineName })).toBeVisible({ timeout: 10_000 });
  });

  test('stakeholder can complete a routine occurrence (regression OLI-234)', async ({ page }) => {
    // First, create a routine that is due today so we can complete it
    await page.goto('/routines');
    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });

    // Check if there's already a due/overdue routine with a checkbox
    const existingCheckbox = page.locator('.task-checkbox').first();
    const hasCompletable = await existingCheckbox.isVisible().catch(() => false);

    if (!hasCompletable) {
      // Create one due yesterday so it's always overdue (the form sets T12:00:00,
      // which is "upcoming" if CI runs before noon UTC — use yesterday to guarantee
      // the routine is overdue and the checkbox renders).
      const routineName = `Completion test ${Date.now()}`;
      await page.locator('.add-rem-btn', { hasText: 'New routine…' }).first().click();
      await page.getByPlaceholder('e.g. Take out the trash').fill(routineName);
      await page.locator('.recurrence-option-row', { hasText: 'Every day' }).click();
      const yesterday = new Date(Date.now() - 86_400_000);
      const yesterdayIso = `${yesterday.getFullYear()}-${String(yesterday.getMonth() + 1).padStart(2, '0')}-${String(yesterday.getDate()).padStart(2, '0')}`;
      await page.locator('input[type="date"]').fill(yesterdayIso);
      await page.getByRole('button', { name: 'Create Routine' }).click();
      await expect(page.locator('.list-card-title', { hasText: routineName })).toBeVisible({ timeout: 10_000 });

      // Reload to ensure due-state is computed and checkbox renders
      await page.goto('/routines');
      await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });
    }

    // Complete the first available routine via its checkbox
    const checkbox = page.locator('.task-checkbox').first();
    await expect(checkbox).toBeVisible({ timeout: 15_000 });
    await checkbox.click();

    // Should show "Marked complete" banner
    await expect(page.getByText('Marked complete')).toBeVisible({ timeout: 10_000 });
  });

  test('routine appears in weekly view after creation', async ({ page }) => {
    const routineName = `Weekly check ${Date.now()}`;
    // Navigate to home (weekly view)
    await page.goto('/');
    await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });

    // Navigate to routines and create one due today
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

    // Go to home — the routine should appear somewhere in the weekly view
    await page.goto('/');
    await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });
    // The routine name should be visible on the page (in nudge tray or weekly grid)
    await expect(page.getByText(routineName)).toBeVisible({ timeout: 15_000 });
  });

  test('spouse view is read-only on routines page', async ({ page }) => {
    // Switch to spouse via localStorage
    await page.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));
    await page.goto('/routines');
    await expect(page.locator('.screen-title')).toContainText('Routines', { timeout: 10_000 });

    // No "New routine…" button for spouse
    await expect(page.locator('.add-rem-btn', { hasText: 'New routine…' })).toHaveCount(0);

    // No completion checkboxes
    await expect(page.locator('.task-checkbox')).toHaveCount(0);

    // Restore stakeholder role
    await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
  });
});
