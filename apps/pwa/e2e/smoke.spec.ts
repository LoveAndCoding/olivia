import { expect, test } from '@playwright/test';

/**
 * Rendered smoke tests — verify every major route loads without blank screens
 * or console errors. These are not functional tests; they confirm the app renders.
 */

const routes = [
  { path: '/', name: 'Home' },
  { path: '/reminders', name: 'Reminders' },
  { path: '/routines', name: 'Routines' },
  { path: '/more/settings', name: 'Settings' },
  { path: '/more/settings/feedback', name: 'Feedback' },
  { path: '/more/settings/automation', name: 'Automation' },
  { path: '/more/history', name: 'History' },
  { path: '/more/week', name: 'Week' },
];

for (const route of routes) {
  test(`smoke: ${route.path} renders without errors`, async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    const response = await page.goto(route.path, { waitUntil: 'networkidle' });

    // Page should return a successful HTTP status
    expect(response?.status()).toBeLessThan(400);

    // Page should not be blank — at least one visible element must exist
    await expect(page.locator('body')).not.toBeEmpty();

    // The app root should have rendered content (not a white screen)
    const appContent = page.locator('#root');
    await expect(appContent).not.toBeEmpty({ timeout: 15_000 });

    // No JS console errors during render
    const realErrors = consoleErrors.filter(
      (e) => !e.includes('service-worker') && !e.includes('favicon'),
    );
    expect(realErrors).toEqual([]);
  });
}
