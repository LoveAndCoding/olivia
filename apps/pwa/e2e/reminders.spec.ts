import { expect, test } from '@playwright/test';

test.describe('Reminder lifecycle', () => {
  test.beforeEach(async ({ page }) => {
    // Ensure stakeholder role
    await page.goto('/settings');
    await expect(page.locator('.screen-title').first()).toContainText('Settings', { timeout: 10_000 });
    await page.getByRole('button', { name: 'Lexi' }).click();
  });

  test('stakeholder can create a reminder with a date chip', async ({ page }) => {
    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    // Open create sheet
    await page.locator('.add-label', { hasText: 'Add a reminder…' }).click();

    // Fill title
    await page.getByPlaceholder('What do you want to remember?').fill('Call the dentist');

    // Select "Today" date chip
    await page.locator('.rem-chip', { hasText: 'Today' }).click();

    // Submit
    await page.getByRole('button', { name: 'Save reminder' }).click();

    // Should show "Reminder created" banner
    await expect(page.getByText('Reminder created')).toBeVisible({ timeout: 10_000 });

    // The reminder should appear in the list
    await expect(page.locator('.rem-title', { hasText: 'Call the dentist' })).toBeVisible({ timeout: 10_000 });
  });

  test('stakeholder can complete a reminder from the detail page', async ({ page }) => {
    // Create a reminder with a past date so it appears as "due" or "overdue".
    // The "Today" chip schedules +1h from now (state: upcoming), so use "+ Custom date"
    // with a past time instead.
    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    await page.locator('.add-label', { hasText: 'Add a reminder…' }).click();
    await page.getByPlaceholder('What do you want to remember?').fill('Complete me test');

    // Use custom date with a past time so the reminder is immediately due/overdue
    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toLocaleString('en-US');
    page.on('dialog', (dialog) => dialog.accept(pastDate));
    await page.locator('.rem-chip', { hasText: '+ Custom date' }).click();

    await page.getByRole('button', { name: 'Save reminder' }).click();
    await expect(page.getByText('Reminder created')).toBeVisible({ timeout: 10_000 });

    // Click on the reminder to go to detail page
    await page.locator('.rem-title', { hasText: 'Complete me test' }).click();

    // Verify we're on the detail page
    await expect(page.locator('.rem-detail-title', { hasText: 'Complete me test' })).toBeVisible({ timeout: 10_000 });

    // Click "Done" button (only visible for due/overdue reminders)
    const doneBtn = page.locator('.rem-btn-done', { hasText: /Done/ });
    await expect(doneBtn).toBeVisible({ timeout: 5_000 });
    await doneBtn.click();

    // Should show "Done" confirmation banner
    await expect(page.locator('.confirm-banner', { hasText: 'Done' })).toBeVisible({ timeout: 10_000 });

    // The title should get the done class (strikethrough)
    await expect(page.locator('.rem-detail-title.done')).toBeVisible({ timeout: 5_000 });
  });

  test('stakeholder can snooze a reminder from the detail page', async ({ page }) => {
    // Create a reminder due today
    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    await page.locator('.add-label', { hasText: 'Add a reminder…' }).click();
    await page.getByPlaceholder('What do you want to remember?').fill('Snooze me test');
    await page.locator('.rem-chip', { hasText: 'Today' }).click();
    await page.getByRole('button', { name: 'Save reminder' }).click();
    await expect(page.getByText('Reminder created')).toBeVisible({ timeout: 10_000 });

    // Click on the reminder to go to detail page
    await page.locator('.rem-title', { hasText: 'Snooze me test' }).click();
    await expect(page.locator('.rem-detail-title', { hasText: 'Snooze me test' })).toBeVisible({ timeout: 10_000 });

    // Click "Snooze" button
    const snoozeBtn = page.locator('.rem-btn-secondary', { hasText: 'Snooze' });
    await expect(snoozeBtn).toBeVisible({ timeout: 5_000 });
    await snoozeBtn.click();

    // Snooze sheet should appear with options
    await expect(page.getByText('Snooze until…')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.snooze-option').first()).toBeVisible();

    // Select the first snooze option
    await page.locator('.snooze-option').first().click();

    // Should show "Snoozed until..." banner
    await expect(page.getByText(/Snoozed until/)).toBeVisible({ timeout: 10_000 });
  });

  test('completed reminder appears in the Done filter', async ({ page }) => {
    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    // Create a reminder with a past date so it's immediately due/overdue
    await page.locator('.add-label', { hasText: 'Add a reminder…' }).click();
    await page.getByPlaceholder('What do you want to remember?').fill('Done filter test');

    const pastDate = new Date(Date.now() - 60 * 60 * 1000).toLocaleString('en-US');
    page.on('dialog', (dialog) => dialog.accept(pastDate));
    await page.locator('.rem-chip', { hasText: '+ Custom date' }).click();

    await page.getByRole('button', { name: 'Save reminder' }).click();
    await expect(page.getByText('Reminder created')).toBeVisible({ timeout: 10_000 });

    // Complete it from detail page
    await page.locator('.rem-title', { hasText: 'Done filter test' }).click();
    await expect(page.locator('.rem-detail-title')).toBeVisible({ timeout: 10_000 });
    const doneBtnFilter = page.locator('.rem-btn-done', { hasText: /Done/ });
    await expect(doneBtnFilter).toBeVisible({ timeout: 5_000 });
    await doneBtnFilter.click();
    await expect(page.locator('.confirm-banner', { hasText: 'Done' })).toBeVisible({ timeout: 10_000 });

    // Go back to reminders list
    await page.locator('.rem-detail-back').click();
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    // Switch to Done filter tab
    await page.locator('.ftab', { hasText: 'Done' }).click();

    // The reminder should appear in completed list
    await expect(page.locator('.rem-title', { hasText: 'Done filter test' })).toBeVisible({ timeout: 10_000 });
  });

  test('spouse view is read-only on reminders page', async ({ page }) => {
    // Switch to spouse
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Christian' }).click();

    await page.goto('/reminders');
    await expect(page.locator('.screen-title')).toContainText('Reminders', { timeout: 10_000 });

    // No "Add a reminder" button for spouse
    await expect(page.locator('.add-label', { hasText: 'Add a reminder…' })).toHaveCount(0);

    // Switch back to stakeholder
    await page.goto('/settings');
    await page.getByRole('button', { name: 'Lexi' }).click();
  });
});
