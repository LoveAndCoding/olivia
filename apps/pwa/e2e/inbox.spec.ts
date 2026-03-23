import { expect, test } from '@playwright/test';

test('stakeholder can add a task via the tasks page', async ({ page }) => {
  const taskName = `schedule HVAC ${Date.now()}`;
  await page.goto('/tasks');
  // Wait for the task list to be loaded
  await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

  // Open the add-task form
  await page.getByRole('button', { name: 'Add a new task' }).click();

  // Fill in the task description and preview
  await page.getByPlaceholder('e.g. Call electrician').fill(taskName);
  await page.getByRole('button', { name: 'Preview' }).click();

  // Confirm the preview shows the review panel
  await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });

  // Save the task
  await page.getByRole('button', { name: 'Confirm & save' }).click();

  // Verify the task appears in the task list
  await expect(page.locator('.tf-name', { hasText: taskName })).toBeVisible({ timeout: 10_000 });
});

test('spouse view stays read-only', async ({ page }) => {
  // Set spouse role via localStorage
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('olivia-role', 'spouse'));

  // Navigate to tasks page — should not show add button
  await page.goto('/tasks');
  await expect(page.locator('.screen-title')).toContainText('Tasks', { timeout: 10_000 });
  await expect(page.getByRole('button', { name: 'Add a new task' })).toHaveCount(0);

  // Spouse sees a read-only notice
  await expect(page.getByText('read-only')).toBeVisible();

  // Restore stakeholder role
  await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));
});

test('stakeholder can queue a task offline and it syncs on reconnect', async ({ page, context }) => {
  // Ensure stakeholder role
  await page.goto('/');
  await page.evaluate(() => localStorage.setItem('olivia-role', 'stakeholder'));

  // Navigate to tasks page and wait for it to load
  await page.goto('/tasks');
  await expect(page.locator('.screen-sub')).toContainText('completed', { timeout: 15_000 });

  // Go offline
  await context.setOffline(true);

  // Add a task while offline — the form should still work
  await page.getByRole('button', { name: 'Add a new task' }).click();
  const offlineTask = `smoke detector ${Date.now()}`;
  await page.getByPlaceholder('e.g. Call electrician').fill(offlineTask);
  await page.getByRole('button', { name: 'Preview' }).click();
  await expect(page.getByText('Review before saving')).toBeVisible({ timeout: 10_000 });
  await page.getByRole('button', { name: 'Confirm & save' }).click();

  // The form should close (confirm succeeded via offline path)
  await expect(page.getByRole('button', { name: 'Add a new task' })).toBeVisible({ timeout: 5_000 });

  // Go back online and reload — the task should appear after sync
  await context.setOffline(false);
  await page.reload();
  await expect(page.locator('.tf-name', { hasText: offlineTask })).toBeVisible({ timeout: 15_000 });
});
