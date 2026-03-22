import { expect, test } from '@playwright/test';

type OnboardingState = {
  needsOnboarding: boolean;
  session: { id: string; status: string; topicsCompleted: string[]; currentTopic: string | null } | null;
  entityCount: number;
};

test.describe('Onboarding flow', () => {
  test('home page renders onboarding card or weekly view based on state (regression OLI-178)', async ({ page }) => {
    // Clear the onboarding-seen flag to allow onboarding UI to appear
    await page.goto('/');
    await page.evaluate(() => localStorage.removeItem('olivia-onboarding-seen'));
    await page.reload();

    // Fetch the onboarding state from the API
    const state: OnboardingState = await page.evaluate(async () => {
      const res = await fetch('/api/onboarding/state');
      return res.json();
    });

    if (state.needsOnboarding && !state.session) {
      // Fresh state — welcome card should appear
      await expect(page.locator('.onb-welcome-card')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByText(/get your household set up/i)).toBeVisible();
      // "Let's go" and "Skip for now" buttons should exist
      await expect(page.getByRole('button', { name: /Let.s go/ })).toBeVisible();
      await expect(page.getByRole('button', { name: /Skip for now/ })).toBeVisible();
    } else if (state.session && state.session.status === 'started') {
      // In-progress session — continue card should appear
      await expect(page.locator('.onb-continue-card')).toBeVisible({ timeout: 15_000 });
      await expect(page.getByRole('button', { name: /Continue/ })).toBeVisible();
    } else {
      // Onboarding completed or not needed — page should load without crash
      // The weekly view or other home content should be visible
      await expect(page.locator('.screen')).toBeVisible({ timeout: 15_000 });
      // No onboarding cards should be visible
      await expect(page.locator('.onb-welcome-card')).not.toBeVisible();
    }
  });

  test('onboarding page renders without crash for any session state (regression OLI-186)', async ({ page }) => {
    await page.goto('/onboarding');

    // The page should render the onboarding container
    await expect(page.locator('.onb-page')).toBeVisible({ timeout: 10_000 });

    // Fetch current state to determine expected UI
    const state: OnboardingState = await page.evaluate(async () => {
      const res = await fetch('/api/onboarding/state');
      return res.json();
    });

    if (state.session && state.session.status === 'started') {
      // Active session — header and progress bar should be visible
      await expect(page.locator('.onb-title')).toContainText('Getting set up');
      await expect(page.locator('.onb-progress-bar')).toBeVisible();

      // Chat input should be available
      await expect(page.locator('.chat-textarea')).toBeVisible({ timeout: 5_000 });
    } else if (state.session && state.session.status === 'finished') {
      // Finished session — header should be visible, "Go to home" button shown
      await expect(page.locator('.onb-title')).toContainText('Getting set up');
      // Input should NOT be visible (onboarding is done)
      await expect(page.locator('.chat-textarea')).not.toBeVisible();
    } else {
      // No session — error state or redirect
      // The page should render something (not a blank/crashed page)
      const hasError = await page.locator('.onb-error-state').isVisible().catch(() => false);
      const hasHeader = await page.locator('.onb-title').isVisible().catch(() => false);
      expect(hasError || hasHeader).toBe(true);
    }
  });

  test('onboarding chat accepts input when session is active', async ({ page }) => {
    // Navigate first so page.evaluate has a base URL
    await page.goto('/');

    // Check if we can start or resume an onboarding session
    const state: OnboardingState = await page.evaluate(async () => {
      const res = await fetch('/api/onboarding/state');
      return res.json();
    });

    if (state.session && state.session.status === 'finished') {
      // Can't test chat interaction when onboarding is already finished
      test.skip();
      return;
    }

    // Start a session if none exists
    if (!state.session) {
      const startRes = await page.evaluate(async () => {
        const res = await fetch('/api/onboarding/start', { method: 'POST' });
        return { ok: res.ok, status: res.status };
      });
      if (!startRes.ok) {
        // AI unavailable or other error — skip
        test.skip();
        return;
      }
    }

    await page.goto('/onboarding');
    await expect(page.locator('.onb-title')).toContainText('Getting set up', { timeout: 10_000 });

    // Chat input should be visible
    const textarea = page.locator('.chat-textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });

    // Type and send a message
    await textarea.fill('I need to remember to pick up groceries and do laundry');
    await page.locator('.chat-send').click();

    // User message should appear in the chat
    await expect(page.locator('.msg-user').last()).toContainText('groceries', { timeout: 5_000 });

    // Wait for Olivia to respond (streaming response — tests SSE)
    const oliviaResponse = page.locator('.msg-olivia').last();
    await expect(oliviaResponse).toBeVisible({ timeout: 30_000 });

    // Olivia's response should have actual text content (not just typing dots)
    await expect(
      oliviaResponse.locator('.msg-bubble p')
    ).not.toBeEmpty({ timeout: 30_000 });
  });

  test('user can exit onboarding via "That\'s enough" button', async ({ page }) => {
    // Navigate first so page.evaluate has a base URL
    await page.goto('/');

    // This test requires an active session with resolved tool calls
    const state: OnboardingState = await page.evaluate(async () => {
      const res = await fetch('/api/onboarding/state');
      return res.json();
    });

    if (!state.session || state.session.status === 'finished') {
      // No active session to exit from — skip
      test.skip();
      return;
    }

    await page.goto('/onboarding');
    await expect(page.locator('.onb-title')).toContainText('Getting set up', { timeout: 10_000 });

    // Send a message to trigger tool calls
    const textarea = page.locator('.chat-textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('Add a task to call the dentist');
    await page.locator('.chat-send').click();

    // Wait for Olivia to respond
    await expect(page.locator('.msg-olivia').last()).toBeVisible({ timeout: 30_000 });
    await expect(page.locator('.typing-indicator')).not.toBeVisible({ timeout: 30_000 });

    // Resolve any pending action cards to trigger exit buttons
    const pendingCards = page.locator('.olivia-action-card').filter({ has: page.locator('.oa-buttons') });
    const cardCount = await pendingCards.count();
    for (let i = 0; i < cardCount; i++) {
      await pendingCards.nth(i).locator('.oa-btn').first().click();
      await page.waitForTimeout(500);
    }

    // Exit buttons should appear after resolving tool calls
    const exitPrompt = page.locator('.onb-exit-prompt');
    await expect(exitPrompt).toBeVisible({ timeout: 15_000 });

    // Click "That's enough" to finish onboarding
    await page.getByRole('button', { name: /That.s enough/ }).click();

    // Should show completion message and "Go to home" button
    await expect(page.getByRole('button', { name: /Go to home/ })).toBeVisible({ timeout: 10_000 });

    // Click "Go to home" — should navigate to home page
    await page.getByRole('button', { name: /Go to home/ }).click();
    await expect(page).toHaveURL('/', { timeout: 5_000 });
  });
});
