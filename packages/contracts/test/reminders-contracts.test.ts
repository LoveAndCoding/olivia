import {
  cancelReminderRequestSchema,
  completeReminderRequestSchema,
  confirmCreateReminderRequestSchema,
  confirmUpdateReminderRequestSchema,
  outboxCommandSchema,
  previewCreateReminderRequestSchema,
  reminderDetailResponseSchema,
  reminderSettingsResponseSchema,
  reminderViewResponseSchema,
  snoozeReminderRequestSchema
} from '../src/index';

const reminderId = '9e544499-d8a6-4066-9f97-bc5ef5ef51e9';
const linkedItemId = '5ce568cf-6112-45fb-a745-09cc6257c57d';

function buildReminder(overrides: Record<string, unknown> = {}) {
  return {
    id: reminderId,
    title: 'Bring the vet records',
    note: 'Paper copies are in the file cabinet.',
    assigneeUserId: null,
    scheduledAt: '2026-03-20T15:00:00.000Z',
    recurrenceCadence: 'weekly',
    linkedInboxItemId: linkedItemId,
    state: 'upcoming',
    linkedInboxItem: {
      id: linkedItemId,
      title: 'Vet appointment prep',
      status: 'open',
      assigneeUserId: null,
      dueAt: '2026-03-21T18:00:00.000Z'
    },
    snoozedUntil: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: '2026-03-14T10:00:00.000Z',
    updatedAt: '2026-03-14T10:00:00.000Z',
    version: 2,
    ...overrides
  };
}

describe('reminder contracts', () => {
  it('parses grouped reminder views with linked inbox context', () => {
    const result = reminderViewResponseSchema.parse({
      remindersByState: {
        upcoming: [buildReminder()],
        due: [],
        overdue: [],
        snoozed: [],
        completed: [],
        cancelled: []
      },
      generatedAt: '2026-03-14T12:00:00.000Z',
      source: 'server'
    });

    expect(result.remindersByState.upcoming[0].linkedInboxItem?.title).toBe('Vet appointment prep');
    expect(result.remindersByState.upcoming[0].recurrenceCadence).toBe('weekly');
  });

  it('parses reminder detail and settings payloads', () => {
    const detail = reminderDetailResponseSchema.parse({
      reminder: buildReminder({ state: 'due' }),
      timeline: [
        {
          id: '4ac7e5aa-8ad7-4eb5-8747-7749f3a67cff',
          reminderId,
          eventType: 'created',
          fromValue: null,
          toValue: { scheduledAt: '2026-03-20T15:00:00.000Z' },
          metadata: null,
          createdAt: '2026-03-14T10:00:00.000Z'
        }
      ]
    });
    const settings = reminderSettingsResponseSchema.parse({
      preferences: {
        userId: 'a0000000-0000-4000-8000-000000000001',
        enabled: true,
        dueRemindersEnabled: true,
        dailySummaryEnabled: false,
        updatedAt: '2026-03-14T10:00:00.000Z'
      }
    });

    expect(detail.timeline[0].eventType).toBe('created');
    expect(settings.preferences.dailySummaryEnabled).toBe(false);
  });

  it('preserves preview/confirm semantics for reminder writes', () => {
    const previewCreate = previewCreateReminderRequestSchema.parse({
      inputText: 'Remind me next Thursday to bring the vet records.'
    });
    const confirmCreate = confirmCreateReminderRequestSchema.parse({
      approved: true,
      finalReminder: {
        id: reminderId,
        title: 'Bring the vet records',
        note: null,
        assigneeUserId: null,
        scheduledAt: '2026-03-20T15:00:00.000Z',
        recurrenceCadence: 'none',
        linkedInboxItemId: null
      }
    });
    const confirmUpdate = confirmUpdateReminderRequestSchema.parse({
      reminderId,
      expectedVersion: 2,
      approved: true,
      proposedChange: {
        scheduledAt: '2026-03-20T18:00:00.000Z',
        recurrenceCadence: 'monthly'
      }
    });
    const complete = completeReminderRequestSchema.parse({
      reminderId,
      expectedVersion: 2,
      approved: true
    });
    const snooze = snoozeReminderRequestSchema.parse({
      reminderId,
      expectedVersion: 2,
      approved: true,
      snoozedUntil: '2026-03-20T19:00:00.000Z'
    });
    const cancel = cancelReminderRequestSchema.parse({
      reminderId,
      expectedVersion: 2,
      approved: true
    });

    expect(previewCreate.inputText).toContain('next Thursday');
    expect(confirmCreate.finalReminder.linkedInboxItemId).toBeNull();
    expect(confirmUpdate.proposedChange.recurrenceCadence).toBe('monthly');
    expect(complete.reminderId).toBe(reminderId);
    expect(snooze.snoozedUntil).toBe('2026-03-20T19:00:00.000Z');
    expect(cancel.approved).toBe(true);
  });

  it('accepts reminder outbox command variants', () => {
    const kinds = [
      outboxCommandSchema.parse({
        kind: 'reminder_create',
        commandId: '7d7f0fa2-4cc7-46be-b8fa-ac555d218787',
        approved: true,
        finalReminder: {
          id: reminderId,
          title: 'Bring the vet records',
          note: null,
          assigneeUserId: null,
          scheduledAt: '2026-03-20T15:00:00.000Z',
          recurrenceCadence: 'none',
          linkedInboxItemId: null
        }
      }).kind,
      outboxCommandSchema.parse({
        kind: 'reminder_update',
        commandId: '8b6e4f28-f4ad-4ae7-a1b3-15e0dd8f615a',
        reminderId,
        expectedVersion: 2,
        approved: true,
        proposedChange: { title: 'Bring the vet records folder' }
      }).kind,
      outboxCommandSchema.parse({
        kind: 'reminder_complete',
        commandId: '8426d3d1-d1fc-4c4d-b2c9-92fbb67f18ff',
        reminderId,
        expectedVersion: 2,
        approved: true
      }).kind,
      outboxCommandSchema.parse({
        kind: 'reminder_snooze',
        commandId: '562d4763-3fd4-4c36-bf94-a19ee4d9efd3',
        reminderId,
        expectedVersion: 2,
        approved: true,
        snoozedUntil: '2026-03-20T19:00:00.000Z'
      }).kind,
      outboxCommandSchema.parse({
        kind: 'reminder_cancel',
        commandId: 'cb9fb5ce-28a7-4663-b79c-634dbe5f4df8',
        reminderId,
        expectedVersion: 2,
        approved: true
      }).kind
    ];

    expect(kinds).toEqual([
      'reminder_create',
      'reminder_update',
      'reminder_complete',
      'reminder_snooze',
      'reminder_cancel'
    ]);
  });
});
