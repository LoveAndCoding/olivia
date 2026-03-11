import { addDays, subDays } from 'date-fns';
import { createDraft, createInboxItem, applyUpdate, buildSuggestions, computeFlags } from '../src/index';

describe('inbox domain', () => {
  it('parses a natural language inbox draft', () => {
    const result = createDraft({
      inputText: 'Add: schedule HVAC service, due next Friday, owner spouse',
      now: new Date('2026-03-11T12:00:00.000Z')
    });

    expect(result.draft.title).toBe('schedule HVAC service');
    expect(result.draft.owner).toBe('spouse');
    expect(result.draft.status).toBe('open');
    expect(result.draft.dueText).toBe('next Friday');
    expect(result.draft.dueAt).not.toBeNull();
    expect(result.parseConfidence).toBe('high');
  });

  it('flags stale and due soon items and limits suggestions', () => {
    const now = new Date('2026-03-20T12:00:00.000Z');
    const overdue = createInboxItem({
      id: crypto.randomUUID(),
      title: 'Pay water bill',
      description: null,
      owner: 'stakeholder',
      status: 'open',
      dueText: 'yesterday',
      dueAt: subDays(now, 1).toISOString()
    }, subDays(now, 20)).item;
    const stale = {
      ...createInboxItem({
        id: crypto.randomUUID(),
        title: 'Call the electrician',
        description: null,
        owner: 'stakeholder',
        status: 'open',
        dueText: null,
        dueAt: null
      }, subDays(now, 20)).item,
      lastStatusChangedAt: subDays(now, 15).toISOString()
    };
    const dueSoon = createInboxItem({
      id: crypto.randomUUID(),
      title: 'Schedule dog groomer',
      description: null,
      owner: 'unassigned',
      status: 'open',
      dueText: 'next week',
      dueAt: addDays(now, 3).toISOString()
    }, now).item;

    expect(computeFlags(stale, now).stale).toBe(true);
    expect(computeFlags(dueSoon, now).dueSoon).toBe(true);

    const suggestions = buildSuggestions([overdue, stale, dueSoon], now);
    expect(suggestions).toHaveLength(2);
    expect(suggestions[0].type).toBe('overdue');
  });

  it('applies status updates with versioning and history', () => {
    const now = new Date('2026-03-11T12:00:00.000Z');
    const { item } = createInboxItem({
      id: crypto.randomUUID(),
      title: 'Schedule HVAC service',
      description: null,
      owner: 'stakeholder',
      status: 'open',
      dueText: 'end of March',
      dueAt: '2026-03-31T12:00:00.000Z'
    }, now);

    const updated = applyUpdate(item, { status: 'in_progress' }, addDays(now, 1));

    expect(updated.updatedItem.status).toBe('in_progress');
    expect(updated.updatedItem.version).toBe(2);
    expect(updated.updatedItem.lastStatusChangedAt).toBe(addDays(now, 1).toISOString());
    expect(updated.historyEntry.eventType).toBe('status_changed');
  });
});
