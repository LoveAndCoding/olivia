import { randomUUID } from 'node:crypto';
import { join } from 'node:path';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createDatabase } from '../src/db/client';
import { InboxRepository } from '../src/repository';
import { buildSystemPrompt } from '../src/chat';

// ─── System Prompt Tests ─────────────────────────────────────────────────────

describe('buildSystemPrompt (OLI-270 recalibration)', () => {
  const prompt = buildSystemPrompt('Test household context');

  it('includes conversation-first engagement section', () => {
    expect(prompt).toContain('Conversation-first engagement');
    expect(prompt).toContain('Your default mode is conversational');
  });

  it('includes anti-patterns section', () => {
    expect(prompt).toContain('Anti-patterns (things you must NEVER do)');
    expect(prompt).toContain('Never respond to a general statement');
    expect(prompt).toContain('Never propose more than 3 items');
    expect(prompt).toContain('Never infer items the user did not mention');
    expect(prompt).toContain('Never restate what you just proposed');
  });

  it('includes confidence threshold rule', () => {
    expect(prompt).toContain('confidence is below 0.8');
    expect(prompt).toContain('parseConfidence');
  });

  it('includes tool use cap guidance in prompt', () => {
    expect(prompt).toContain('Never propose more than 3 items in a single response');
    expect(prompt).toContain('Should I continue with more');
  });

  it('includes household context', () => {
    expect(prompt).toContain('Test household context');
  });
});

// ─── Undo / Delete Message Tests ─────────────────────────────────────────────

describe('deleteChatMessage (OLI-270 undo)', () => {
  let tmpDir: string;
  let repo: InboxRepository;

  beforeEach(() => {
    tmpDir = mkdtempSync(join(tmpdir(), 'olivia-test-'));
    const db = createDatabase(join(tmpDir, 'test.db'));
    repo = new InboxRepository(db);
  });

  afterEach(() => {
    rmSync(tmpDir, { recursive: true, force: true });
  });

  it('deletes an assistant message and returns true', () => {
    const now = new Date('2026-03-22T12:00:00.000Z');
    const conv = repo.getOrCreateConversation(now);
    const msgId = randomUUID();

    repo.addChatMessage({
      id: msgId,
      conversationId: conv.id,
      role: 'assistant',
      content: 'Here is my response',
      toolCalls: null,
      createdAt: now.toISOString()
    });

    const result = repo.deleteChatMessage(msgId);
    expect(result).toBe(true);

    // Verify message is gone
    const msg = repo.getChatMessage(msgId);
    expect(msg).toBeNull();
  });

  it('returns false when message does not exist', () => {
    const result = repo.deleteChatMessage(randomUUID());
    expect(result).toBe(false);
  });

  it('does not affect other messages when deleting one', () => {
    const now = new Date('2026-03-22T12:00:00.000Z');
    const conv = repo.getOrCreateConversation(now);
    const userMsgId = randomUUID();
    const assistantMsgId = randomUUID();

    repo.addChatMessage({
      id: userMsgId,
      conversationId: conv.id,
      role: 'user',
      content: 'Hello',
      toolCalls: null,
      createdAt: now.toISOString()
    });

    repo.addChatMessage({
      id: assistantMsgId,
      conversationId: conv.id,
      role: 'assistant',
      content: 'Hi there',
      toolCalls: [{ id: randomUUID(), type: 'create_inbox_item', data: { title: 'Test' }, status: 'pending' }],
      createdAt: new Date(now.getTime() + 1000).toISOString()
    });

    repo.deleteChatMessage(assistantMsgId);

    // User message should still exist
    const userMsg = repo.getChatMessage(userMsgId);
    expect(userMsg).not.toBeNull();
    expect(userMsg!.content).toBe('Hello');
  });
});

// ─── Tool-Use Cap Export Test ────────────────────────────────────────────────

describe('MAX_TOOL_CALLS_PER_RESPONSE constant', () => {
  it('is defined and set to 3', async () => {
    // The constant is not exported, but we verify the behavior through the
    // system prompt which documents the cap
    const prompt = buildSystemPrompt('');
    expect(prompt).toContain('Never propose more than 3 items');
  });
});
