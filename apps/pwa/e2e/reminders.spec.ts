import { expect, test } from '@playwright/test';

function dateTimeLocal(offsetMinutes: number) {
  const target = new Date(Date.now() + offsetMinutes * 60 * 1000);
  const year = target.getFullYear();
  const month = String(target.getMonth() + 1).padStart(2, '0');
  const day = String(target.getDate()).padStart(2, '0');
  const hours = String(target.getHours()).padStart(2, '0');
  const minutes = String(target.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

test('stakeholder can create and complete a recurring reminder', async ({ page }) => {
  const suffix = Date.now().toString();
  const reminderTitle = `Weekly vet records reminder ${suffix}`;

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Lexi' }).click();

  await page.goto('/reminders');
  await page.getByRole('button', { name: 'New reminder' }).click();
  await page.getByRole('button', { name: 'Structured fallback' }).click();
  await page.getByLabel('Title').fill(reminderTitle);
  await page.getByLabel('When').fill(dateTimeLocal(-60));
  await page.getByLabel('Recurrence').selectOption('weekly');
  await page.getByRole('button', { name: 'Preview reminder' }).click();
  await page.getByRole('button', { name: 'Confirm and save' }).click();

  await expect(page.getByText(reminderTitle)).toBeVisible();
  await page.getByText(reminderTitle).click();
  await expect(page.getByRole('heading', { name: reminderTitle })).toBeVisible();
  await page.getByRole('button', { name: 'Complete occurrence' }).click();
  await expect(page.getByText(/State: upcoming/i)).toBeVisible();
});

test('linked reminders keep inbox state unchanged and spouse stays read-only', async ({ page }) => {
  const suffix = Date.now().toString();
  const taskTitle = `Renew car registration follow-up ${suffix}`;
  const reminderTitle = `Reminder for ${taskTitle}`;

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Lexi' }).click();

  await page.goto('/tasks');
  await page.getByRole('button', { name: 'Add a new task' }).click();
  await page.getByPlaceholder('e.g. Call electrician about the kitchen outlet, due next week').fill(taskTitle);
  await page.getByRole('button', { name: 'Preview' }).click();
  await page.getByRole('button', { name: 'Confirm & save' }).click();
  const taskCard = page.locator('.task-full').filter({ hasText: taskTitle }).first();
  await expect(taskCard).toBeVisible();
  await taskCard.click();

  await expect(page.getByRole('heading', { name: taskTitle })).toBeVisible();
  await expect(page.getByText(/Status: open/i)).toBeVisible();
  await page.getByRole('button', { name: 'Add reminder from this item' }).click();
  await page.getByLabel('Reminder title').fill(reminderTitle);
  await page.getByLabel('Surface at').fill(dateTimeLocal(120));
  await page.getByRole('button', { name: 'Preview linked reminder' }).click();
  await page.getByRole('button', { name: 'Confirm linked reminder' }).click();

  await expect(page.getByText(reminderTitle)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/Status: open/i)).toBeVisible();

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Alexander' }).click();
  await page.goto('/reminders');
  await expect(page.getByText('only Lexi can create or change reminders in this first slice')).toBeVisible();
  await expect(page.getByRole('button', { name: 'New reminder' })).toHaveCount(0);
});

test('stakeholder can queue a reminder offline and sync it on reconnect', async ({ page, context }) => {
  const suffix = Date.now().toString();
  const reminderTitle = `Offline reminder sync ${suffix}`;

  await page.goto('/settings');
  await page.getByRole('button', { name: 'Lexi' }).click();

  await page.goto('/reminders');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'New reminder' }).click();
  await page.getByRole('button', { name: 'Structured fallback' }).click();
  await page.getByLabel('Title').fill(reminderTitle);
  await page.getByLabel('When').fill(dateTimeLocal(90));
  await page.getByRole('button', { name: 'Preview reminder' }).click();
  await page.getByRole('button', { name: 'Confirm and save' }).click();

  await expect(page.getByText(reminderTitle)).toBeVisible();
  await expect(page.getByText('Pending sync')).toBeVisible();

  await page.goto('/settings');
  await expect(page.getByText(/Pending commands: 1/)).toBeVisible();
  await context.setOffline(false);
  await page.reload();
  await expect.poll(async () => page.getByText(/Pending commands:/).textContent(), { timeout: 10_000 }).toContain('Pending commands: 0');

  await page.goto('/reminders');
  await expect(page.getByText(reminderTitle)).toBeVisible();
});
