import { expect, test } from '@playwright/test';

test.describe('Chat / AI interaction', () => {
  test('chat page shows empty state with quick chips', async ({ page }) => {
    // Clear any existing conversation first
    await page.goto('/olivia');
    await page.evaluate(async () => {
      await fetch('/api/chat/conversation/clear', { method: 'POST' });
    });
    await page.reload();

    // Verify the chat header
    await expect(page.locator('.ai-title')).toContainText('Olivia', { timeout: 10_000 });
    await expect(page.locator('.ai-sub')).toContainText('household assistant');

    // Empty state should be visible
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.empty-state-heading')).toContainText('What can I help with?');

    // Quick chips should be visible
    await expect(page.locator('.quick-chips')).toBeVisible();
    await expect(page.locator('.quick-chip').first()).toBeVisible();
  });

  test('user can send a message and receive a streaming response', async ({ page }) => {
    // Clear conversation for a clean test
    await page.goto('/olivia');
    await page.evaluate(async () => {
      await fetch('/api/chat/conversation/clear', { method: 'POST' });
    });
    await page.reload();
    await expect(page.locator('.ai-title')).toContainText('Olivia', { timeout: 10_000 });

    // Type and send a message
    const textarea = page.locator('.chat-textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('What day is it today?');
    await page.locator('.chat-send').click();

    // User message should appear
    await expect(page.locator('.msg-user')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.msg-user .msg-bubble')).toContainText('What day is it today?');

    // Typing indicator should appear while streaming
    // (It may be very brief, so we just check that a response eventually arrives)

    // Wait for Olivia's response to finish streaming
    const oliviaMsg = page.locator('.msg-olivia').last();
    await expect(oliviaMsg).toBeVisible({ timeout: 30_000 });

    // The response should contain actual text content (not empty or just typing dots)
    await expect(oliviaMsg.locator('.msg-bubble')).not.toBeEmpty({ timeout: 30_000 });

    // Verify the typing indicator is gone (streaming finished)
    await expect(page.locator('.typing-indicator')).not.toBeVisible({ timeout: 30_000 });

    // The empty state should no longer be visible
    await expect(page.locator('.empty-state')).not.toBeVisible();
  });

  test('quick chip populates input field', async ({ page }) => {
    // Clear conversation for clean state
    await page.goto('/olivia');
    await page.evaluate(async () => {
      await fetch('/api/chat/conversation/clear', { method: 'POST' });
    });
    await page.reload();
    await expect(page.locator('.ai-title')).toContainText('Olivia', { timeout: 10_000 });

    // Click a quick chip
    const firstChip = page.locator('.quick-chip').first();
    await expect(firstChip).toBeVisible({ timeout: 5_000 });
    const chipText = await firstChip.textContent();
    await firstChip.click();

    // The input should be populated with the chip text
    const textarea = page.locator('.chat-textarea');
    await expect(textarea).toHaveValue(chipText!.trim(), { timeout: 2_000 });
  });

  test('chat page recovers gracefully after page reload', async ({ page }) => {
    // Send a message, then reload — page should not crash
    await page.goto('/olivia');
    await page.evaluate(async () => {
      await fetch('/api/chat/conversation/clear', { method: 'POST' });
    });
    await page.reload();
    await expect(page.locator('.ai-title')).toContainText('Olivia', { timeout: 10_000 });

    const textarea = page.locator('.chat-textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('Hello from the reload test');
    await page.locator('.chat-send').click();

    // Wait for response to finish streaming
    await expect(page.locator('.msg-olivia').last().locator('.msg-bubble')).not.toBeEmpty({ timeout: 30_000 });
    await expect(page.locator('.typing-indicator')).not.toBeVisible({ timeout: 30_000 });

    // Reload the page — chat should recover without errors
    await page.reload();
    await expect(page.locator('.ai-title')).toContainText('Olivia', { timeout: 15_000 });
    await expect(page.locator('.chat-textarea')).toBeVisible({ timeout: 5_000 });

    // Page should be functional — no crash, no console errors
    // Either messages are loaded from server or empty state is shown
    const hasMessages = await page.locator('.msg-user').count();
    if (hasMessages > 0) {
      await expect(page.locator('.msg-user .msg-bubble')).toContainText('Hello from the reload test');
    } else {
      await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5_000 });
    }
  });

  test('clear conversation removes all messages', async ({ page }) => {
    // Send a message first so there's something to clear
    await page.goto('/olivia');
    await page.evaluate(async () => {
      await fetch('/api/chat/conversation/clear', { method: 'POST' });
    });
    await page.reload();
    await expect(page.locator('.ai-title')).toContainText('Olivia', { timeout: 10_000 });

    const textarea = page.locator('.chat-textarea');
    await expect(textarea).toBeVisible({ timeout: 5_000 });
    await textarea.fill('Hello Olivia');
    await page.locator('.chat-send').click();

    // Wait for response
    await expect(page.locator('.msg-olivia').last().locator('.msg-bubble')).not.toBeEmpty({ timeout: 30_000 });
    await expect(page.locator('.typing-indicator')).not.toBeVisible({ timeout: 30_000 });

    // Click clear button
    await page.locator('.chat-clear-btn').click();

    // Confirm clear
    await expect(page.locator('.chat-clear-confirm')).toBeVisible({ timeout: 2_000 });
    await page.locator('.chat-clear-yes').click();

    // Messages should be gone, empty state should return
    await expect(page.locator('.empty-state')).toBeVisible({ timeout: 5_000 });
    await expect(page.locator('.msg-user')).not.toBeVisible();
  });
});
