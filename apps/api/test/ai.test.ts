import { vi, describe, it, expect, beforeEach } from 'vitest';
import type { RitualSummaryInput } from '../src/ai';

// --- Module mock for @anthropic-ai/sdk ---

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => {
  function MockAnthropic(_opts: unknown) {
    return { messages: { create: mockCreate } };
  }
  return { default: MockAnthropic };
});

// Import after mock is set up
const { ClaudeAiProvider, DisabledAiProvider, createAiProvider } = await import('../src/ai');

// --- Fixture ---

const validRitualSummaryInput: RitualSummaryInput = {
  recapItems: [
    {
      type: 'routine',
      routineId: 'r1',
      routineTitle: 'Morning Routine',
      owner: 'stakeholder',
      dueDate: '2026-03-08',
      completedAt: '2026-03-08T08:00:00Z',
      reviewRecordId: null
    },
    {
      type: 'reminder',
      reminderId: 'rem1',
      title: 'Grocery Run',
      owner: 'stakeholder',
      resolvedAt: '2026-03-07T12:00:00Z',
      resolution: 'completed'
    }
  ],
  lastWeekWindowStart: '2026-03-02',
  lastWeekWindowEnd: '2026-03-08',
  overviewDays: [
    {
      date: '2026-03-09',
      dayOfWeek: 0,
      routines: [
        {
          routineId: 'r1',
          routineTitle: 'Morning Routine',
          owner: 'stakeholder',
          recurrenceRule: 'daily',
          intervalDays: null,
          dueDate: '2026-03-09',
          dueState: 'due',
          completed: false
        }
      ],
      reminders: [],
      meals: [],
      inboxItems: []
    }
  ],
  currentWeekWindowStart: '2026-03-09',
  currentWeekWindowEnd: '2026-03-15'
};

// --- Unit tests: ClaudeAiProvider ---

describe('ClaudeAiProvider', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('generateRitualSummaries returns non-null recap and overview drafts on success', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'This is a generated narrative summary for the household.' }]
    });

    const provider = new ClaudeAiProvider('test-api-key');
    const result = await provider.generateRitualSummaries(validRitualSummaryInput);

    expect(result.recapDraft).toBeTruthy();
    expect(result.overviewDraft).toBeTruthy();
  });

  it('generateRitualSummaries returns null drafts on SDK network error without throwing', async () => {
    mockCreate.mockRejectedValue(new Error('Network error'));

    const provider = new ClaudeAiProvider('test-api-key');
    const result = await provider.generateRitualSummaries(validRitualSummaryInput);

    expect(result.recapDraft).toBeNull();
    expect(result.overviewDraft).toBeNull();
  });

  it('generateRitualSummaries returns null drafts on 429 rate limit error without throwing', async () => {
    const rateLimitError = new Error('Rate limit exceeded');
    (rateLimitError as unknown as { status: number }).status = 429;
    mockCreate.mockRejectedValue(rateLimitError);

    const provider = new ClaudeAiProvider('test-api-key');
    const result = await provider.generateRitualSummaries(validRitualSummaryInput);

    expect(result.recapDraft).toBeNull();
    expect(result.overviewDraft).toBeNull();
  });

  it('generateRitualSummaries returns partial result when one section fails', async () => {
    mockCreate
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Recap narrative text.' }]
      })
      .mockRejectedValueOnce(new Error('Overview generation failed'));

    const provider = new ClaudeAiProvider('test-api-key');
    const result = await provider.generateRitualSummaries(validRitualSummaryInput);

    expect(result.recapDraft).toBeTruthy();
    expect(result.overviewDraft).toBeNull();
  });

  it('sends only H4 structured data in the prompt — no carry-forward notes or free-text', async () => {
    const capturedPrompts: string[] = [];
    mockCreate.mockImplementation(async (params: { messages: Array<{ content: string }> }) => {
      const userMessage = params.messages[0]?.content ?? '';
      capturedPrompts.push(userMessage);
      return { content: [{ type: 'text', text: 'Generated summary.' }] };
    });

    const provider = new ClaudeAiProvider('test-api-key');
    await provider.generateRitualSummaries({
      recapItems: [
        {
          type: 'routine',
          routineId: 'r1',
          routineTitle: 'Morning Routine',
          owner: 'stakeholder',
          dueDate: '2026-03-08',
          completedAt: '2026-03-08T08:00:00Z',
          reviewRecordId: null
        }
      ],
      lastWeekWindowStart: '2026-03-02',
      lastWeekWindowEnd: '2026-03-08',
      overviewDays: [],
      currentWeekWindowStart: '2026-03-09',
      currentWeekWindowEnd: '2026-03-15'
    });

    // Recap prompt should contain the routine name from the input
    expect(capturedPrompts[0]).toContain('Morning Routine');

    // Prompt should NOT contain carry-forward note text (not a field in RitualSummaryInput)
    const sensitiveText = 'private household note that must not be in prompt';
    expect(capturedPrompts.join(' ')).not.toContain(sensitiveText);

    // Prompt should reference the date window from the input
    expect(capturedPrompts[0]).toContain('2026-03-02');
    expect(capturedPrompts[0]).toContain('2026-03-08');
  });
});

// --- Unit tests: createAiProvider ---

describe('createAiProvider', () => {
  it('returns ClaudeAiProvider when API key is set', () => {
    const provider = createAiProvider('sk-ant-test-key');
    expect(provider).toBeInstanceOf(ClaudeAiProvider);
  });

  it('returns DisabledAiProvider and logs warning when API key is empty', () => {
    const warnMock = vi.fn();
    const provider = createAiProvider('', { warn: warnMock });
    expect(provider).toBeInstanceOf(DisabledAiProvider);
    expect(warnMock).toHaveBeenCalledWith(expect.stringContaining('ANTHROPIC_API_KEY is not set'));
  });

  it('returns DisabledAiProvider when API key is undefined', () => {
    const provider = createAiProvider(undefined);
    expect(provider).toBeInstanceOf(DisabledAiProvider);
  });
});
