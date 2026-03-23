import { fileURLToPath } from 'node:url';
import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { addHours, addMinutes, addDays, subDays, format, startOfWeek, endOfWeek, subWeeks } from 'date-fns';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/client';
import { evaluateDailySummaryRule, evaluateDueReminderRule } from '../src/jobs';
import { DisabledApnsPushProvider } from '../src/push';
import { InboxRepository } from '../src/repository';
import { createReminder } from '@olivia/domain';

const createConfig = (dbPath: string): AppConfig => ({
  port: 0,
  dbPath,
  staleThresholdDays: 14,
  dueSoonDays: 7,
  aiProvider: 'disabled',
  notificationsEnabled: false,
  vapidPublicKey: null,
  vapidPrivateKey: null,
  vapidContact: 'mailto:test@localhost',
  notificationRules: { dueSoonEnabled: false, staleItemEnabled: false, digestEnabled: false },
  notificationIntervalMs: 3_600_000,
  nudgePushIntervalMs: 1_800_000,
  pwaOrigin: 'http://localhost:4173',
  householdTimezone: 'UTC',
  apns: { keyId: null, teamId: null, privateKey: null, bundleId: 'com.loveandcoding.olivia', useSandbox: true },
  paperclip: { apiUrl: null, apiKey: null, companyId: null, sreAgentId: null },
  auth: { enabled: false, resendApiKey: null },
});

const validPushPayload = {
  endpoint: 'https://push.example.com/subscription',
  keys: {
    p256dh: 'fake-p256dh',
    auth: 'fake-auth'
  }
};

const noApns = new DisabledApnsPushProvider();
const makeLogger = () =>
  ({ info: () => {}, warn: () => {}, debug: () => {}, error: () => {} }) as unknown as Parameters<typeof evaluateDueReminderRule>[4];

async function createInboxItemViaApi(app: Awaited<ReturnType<typeof buildApp>>, title: string) {
  const preview = await app.inject({
    method: 'POST',
    url: '/api/inbox/items/preview-create',
    payload: {
      actorRole: 'stakeholder',
      structuredInput: {
        title,
        owner: 'stakeholder'
      }
    }
  });
  const previewBody = preview.json();

  const confirm = await app.inject({
    method: 'POST',
    url: '/api/inbox/items/confirm-create',
    payload: {
      actorRole: 'stakeholder',
      draftId: previewBody.draftId,
      approved: true,
      finalItem: previewBody.parsedItem
    }
  });

  expect(confirm.statusCode).toBe(200);
  return confirm.json().savedItem;
}

async function createReminderViaApi(
  app: Awaited<ReturnType<typeof buildApp>>,
  overrides: Record<string, unknown> = {}
) {
  const preview = await app.inject({
    method: 'POST',
    url: '/api/reminders/preview-create',
    payload: {
      actorRole: 'stakeholder',
      structuredInput: {
        title: 'Bring the vet records',
        owner: 'stakeholder',
        scheduledAt: addHours(new Date(), 2).toISOString(),
        recurrenceCadence: 'none',
        note: null,
        linkedInboxItemId: null,
        ...overrides
      }
    }
  });
  expect(preview.statusCode).toBe(200);
  const previewBody = preview.json();

  const confirm = await app.inject({
    method: 'POST',
    url: '/api/reminders/confirm-create',
    payload: {
      actorRole: 'stakeholder',
      draftId: previewBody.draftId,
      approved: true,
      finalReminder: previewBody.parsedReminder
    }
  });
  expect(confirm.statusCode).toBe(200);
  return confirm.json();
}

describe('household inbox api', () => {
  it('requires preview and approval before writes are persisted', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'stakeholder',
        inputText: 'Add: schedule HVAC service, owner me, due next Friday'
      }
    });

    expect(preview.statusCode).toBe(200);
    const previewBody = preview.json();

    const beforeConfirm = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=stakeholder&view=all'
    });
    expect(beforeConfirm.json().itemsByStatus.open).toHaveLength(0);

    const confirm = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-create',
      payload: {
        actorRole: 'stakeholder',
        draftId: previewBody.draftId,
        approved: true,
        finalItem: previewBody.parsedItem
      }
    });

    expect(confirm.statusCode).toBe(200);

    const afterConfirm = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=stakeholder&view=all'
    });
    expect(afterConfirm.json().itemsByStatus.open).toHaveLength(1);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('allows both stakeholder and spouse write access (multi-user household)', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Spouse can now write — both household members have full access
    const spouseWrite = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'spouse',
        inputText: 'Add: order filters'
      }
    });

    expect(spouseWrite.statusCode).toBe(200);
    expect(spouseWrite.json().draftId).toBeTruthy();

    const spouseRead = await app.inject({
      method: 'GET',
      url: '/api/inbox/items?actorRole=spouse&view=active'
    });

    expect(spouseRead.statusCode).toBe(200);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('rejects stale version updates with a version conflict', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/preview-create',
      payload: {
        actorRole: 'stakeholder',
        inputText: 'Add: call the plumber, owner me'
      }
    });
    const previewBody = preview.json();

    const confirm = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-create',
      payload: {
        actorRole: 'stakeholder',
        draftId: previewBody.draftId,
        approved: true,
        finalItem: previewBody.parsedItem
      }
    });

    const created = confirm.json().savedItem;

    const firstUpdate = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: created.id,
        expectedVersion: created.version,
        approved: true,
        proposedChange: { status: 'in_progress' }
      }
    });
    expect(firstUpdate.statusCode).toBe(200);

    const staleUpdate = await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: created.id,
        expectedVersion: created.version,
        approved: true,
        proposedChange: { status: 'done' }
      }
    });

    expect(staleUpdate.statusCode).toBe(409);
    expect(staleUpdate.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('exposes VAPID public key endpoint', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-api-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const response = await app.inject({ method: 'GET', url: '/api/notifications/vapid-public-key' });
    expect(response.statusCode).toBe(200);
    expect(response.json().notificationsEnabled).toBe(false);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('reminder migrations and api', () => {
  it('upgrades an inbox-only database to the reminder-capable schema without data loss', () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-migrate-'));
    const dbPath = join(directory, 'legacy.sqlite');
    const legacyDb = new Database(dbPath);
    const legacySqlPath = fileURLToPath(new URL('../drizzle/0000_initial.sql', import.meta.url));
    legacyDb.exec(readFileSync(legacySqlPath, 'utf8'));
    legacyDb
      .prepare(`
        INSERT INTO inbox_items (
          id, title, description, owner, status, due_at, due_text, created_at, updated_at, version,
          last_status_changed_at, last_note_at, archived_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)
      .run(
        crypto.randomUUID(),
        'Legacy inbox item',
        null,
        'stakeholder',
        'open',
        null,
        null,
        '2026-03-01T09:00:00.000Z',
        '2026-03-01T09:00:00.000Z',
        1,
        '2026-03-01T09:00:00.000Z',
        null,
        null
      );
    legacyDb.close();

    const upgradedDb = createDatabase(dbPath);
    const repository = new InboxRepository(upgradedDb);
    const migrationFiles = upgradedDb
      .prepare('SELECT filename FROM schema_migrations ORDER BY filename ASC')
      .all() as Array<{ filename: string }>;
    const reminderTables = upgradedDb
      .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name IN ('reminders', 'reminder_timeline', 'reminder_notification_preferences', 'notification_delivery_log')")
      .all() as Array<{ name: string }>;

    expect(repository.listItems()).toHaveLength(1);
    expect(migrationFiles.map((row) => row.filename)).toEqual(['0000_initial.sql', '0001_first_class_reminders.sql', '0002_shared_lists.sql', '0003_recurring_routines.sql', '0004_meal_planning.sql', '0005_planning_ritual_support.sql', '0006_ai_ritual_summaries.sql', '0007_push_notifications.sql', '0008_chat_conversations.sql', '0009_onboarding_sessions.sql', '0010_data_freshness.sql', '0011_routines_flexible_scheduling.sql', '0012_auth_identity.sql', '0013_user_attribution.sql', '0014_backfill_user_attribution.sql']);
    expect(reminderTables.map((row) => row.name).sort()).toEqual([
      'notification_delivery_log',
      'reminder_notification_preferences',
      'reminder_timeline',
      'reminders'
    ]);

    upgradedDb.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('supports stakeholder reminder create, edit, snooze, complete, and cancel flows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-reminders-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const inboxItem = await createInboxItemViaApi(app, 'Prep for the vet visit');
    const created = await createReminderViaApi(app, {
      title: 'Bring the vet records',
      linkedInboxItemId: inboxItem.id,
      recurrenceCadence: 'daily',
      scheduledAt: addMinutes(new Date(), 30).toISOString()
    });

    expect(created.savedReminder.linkedInboxItemId).toBe(inboxItem.id);

    const listResponse = await app.inject({
      method: 'GET',
      url: '/api/reminders?actorRole=stakeholder'
    });
    expect(listResponse.statusCode).toBe(200);
    expect(listResponse.json().remindersByState.upcoming).toHaveLength(1);

    const updated = await app.inject({
      method: 'POST',
      url: '/api/reminders/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: created.savedReminder.version,
        approved: true,
        proposedChange: {
          title: 'Bring the vet records folder',
          note: 'Check the booster paperwork too.'
        }
      }
    });
    expect(updated.statusCode).toBe(200);

    const snoozedUntil = addHours(new Date(), 6).toISOString();
    const snoozed = await app.inject({
      method: 'POST',
      url: '/api/reminders/snooze',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: updated.json().savedReminder.version,
        approved: true,
        snoozedUntil
      }
    });
    expect(snoozed.statusCode).toBe(200);
    expect(snoozed.json().savedReminder.snoozedUntil).toBe(snoozedUntil);

    const completed = await app.inject({
      method: 'POST',
      url: '/api/reminders/complete',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: snoozed.json().savedReminder.version,
        approved: true
      }
    });
    expect(completed.statusCode).toBe(200);
    expect(completed.json().savedReminder.recurrenceCadence).toBe('daily');
    expect(new Date(completed.json().savedReminder.scheduledAt).getTime()).toBeGreaterThan(new Date(snoozedUntil).getTime());

    const detail = await app.inject({
      method: 'GET',
      url: `/api/reminders/${created.savedReminder.id}?actorRole=stakeholder`
    });
    expect(detail.statusCode).toBe(200);
    expect(detail.json().reminder.linkedInboxItem.title).toBe('Prep for the vet visit');
    expect(detail.json().timeline.map((entry: { eventType: string }) => entry.eventType)).toEqual(
      expect.arrayContaining(['created', 'rescheduled', 'snoozed', 'completed', 'recurrence_advanced'])
    );

    const itemDetail = await app.inject({
      method: 'GET',
      url: `/api/inbox/items/${inboxItem.id}?actorRole=stakeholder`
    });
    expect(itemDetail.statusCode).toBe(200);
    expect(itemDetail.json().item.status).toBe('open');

    const oneTimeReminder = await createReminderViaApi(app, {
      title: 'Pick up the package',
      recurrenceCadence: 'none'
    });
    const cancelled = await app.inject({
      method: 'POST',
      url: '/api/reminders/cancel',
      payload: {
        actorRole: 'stakeholder',
        reminderId: oneTimeReminder.savedReminder.id,
        expectedVersion: oneTimeReminder.savedReminder.version,
        approved: true
      }
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().savedReminder.state).toBe('cancelled');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('keeps spouse reminder access read-only and rejects stale reminder writes', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-reminders-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const created = await createReminderViaApi(app, {
      title: 'Swap the air filter',
      scheduledAt: addHours(new Date(), 1).toISOString()
    });

    const spouseList = await app.inject({
      method: 'GET',
      url: '/api/reminders?actorRole=spouse'
    });
    expect(spouseList.statusCode).toBe(200);

    // Spouse can now write — both household members have full access
    const spouseWrite = await app.inject({
      method: 'POST',
      url: '/api/reminders/preview-create',
      payload: {
        actorRole: 'spouse',
        structuredInput: {
          title: 'Order detergent',
          owner: 'stakeholder',
          scheduledAt: addDays(new Date(), 1).toISOString()
        }
      }
    });
    expect(spouseWrite.statusCode).toBe(200);
    expect(spouseWrite.json().draftId).toBeTruthy();

    const firstUpdate = await app.inject({
      method: 'POST',
      url: '/api/reminders/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: created.savedReminder.version,
        approved: true,
        proposedChange: { note: 'Buy the 16x25 size.' }
      }
    });
    expect(firstUpdate.statusCode).toBe(200);

    const staleUpdate = await app.inject({
      method: 'POST',
      url: '/api/reminders/snooze',
      payload: {
        actorRole: 'stakeholder',
        reminderId: created.savedReminder.id,
        expectedVersion: created.savedReminder.version,
        approved: true,
        snoozedUntil: addHours(new Date(), 8).toISOString()
      }
    });
    expect(staleUpdate.statusCode).toBe(409);
    expect(staleUpdate.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('supports AI-disabled structured reminder creation, settings persistence, and real push-subscription validation', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-reminders-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const preview = await app.inject({
      method: 'POST',
      url: '/api/reminders/preview-create',
      payload: {
        actorRole: 'stakeholder',
        structuredInput: {
          title: 'Review camp forms',
          owner: 'stakeholder',
          scheduledAt: addDays(new Date(), 2).toISOString(),
          recurrenceCadence: 'monthly',
          note: 'Check the signature line.'
        }
      }
    });
    expect(preview.statusCode).toBe(200);
    expect(preview.json().parserSource).toBe('rules');
    expect(preview.json().parsedReminder.title).toBe('Review camp forms');

    const settingsBefore = await app.inject({
      method: 'GET',
      url: '/api/reminders/settings?actorRole=stakeholder'
    });
    expect(settingsBefore.statusCode).toBe(200);
    expect(settingsBefore.json().preferences.enabled).toBe(false);

    const settingsSaved = await app.inject({
      method: 'POST',
      url: '/api/reminders/settings',
      payload: {
        actorRole: 'stakeholder',
        preferences: {
          enabled: true,
          dueRemindersEnabled: true,
          dailySummaryEnabled: false
        }
      }
    });
    expect(settingsSaved.statusCode).toBe(200);

    const settingsAfter = await app.inject({
      method: 'GET',
      url: '/api/reminders/settings?actorRole=stakeholder'
    });
    expect(settingsAfter.json().preferences).toMatchObject({
      actorRole: 'stakeholder',
      enabled: true,
      dueRemindersEnabled: true,
      dailySummaryEnabled: false
    });

    const invalidSubscription = await app.inject({
      method: 'POST',
      url: '/api/notifications/subscriptions',
      payload: {
        actorRole: 'stakeholder',
        endpoint: 'https://push.example.com/demo',
        payload: { endpoint: 'https://push.example.com/demo' }
      }
    });
    expect(invalidSubscription.statusCode).toBe(400);
    expect(invalidSubscription.json().code).toBe('INVALID_PUSH_SUBSCRIPTION');

    const validSubscription = await app.inject({
      method: 'POST',
      url: '/api/notifications/subscriptions',
      payload: {
        actorRole: 'stakeholder',
        endpoint: validPushPayload.endpoint,
        payload: validPushPayload
      }
    });
    expect(validSubscription.statusCode).toBe(200);
    expect(validSubscription.json().subscription.endpoint).toBe(validPushPayload.endpoint);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('reminder notification jobs', () => {
  it('respects reminder notification preferences, valid push readiness, and due-reminder dedupe', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const dbPath = join(directory, 'test.sqlite');
    const db = createDatabase(dbPath);
    const repository = new InboxRepository(db);
    const now = new Date('2026-03-14T08:15:00.000Z');
    const dueReminder = createReminder({
      id: crypto.randomUUID(),
      title: 'Call the pediatrician',
      note: null,
      owner: 'stakeholder',
      scheduledAt: subDays(now, 1).toISOString(),
      recurrenceCadence: 'none',
      linkedInboxItemId: null
    }, subDays(now, 2));

    repository.createReminder(dueReminder.reminder, dueReminder.timelineEntries);
    repository.saveNotificationSubscription('stakeholder', 'https://push.example.com/demo-invalid', {
      endpoint: 'https://push.example.com/demo-invalid'
    });

    const attempted: string[] = [];
    const trackingPush: Parameters<typeof evaluateDueReminderRule>[1] = {
      isConfigured: () => true,
      send: async (_subscription, notification) => {
        attempted.push(notification.tag);
      }
    };

    const config = { ...createConfig(dbPath), notificationsEnabled: true };
    await evaluateDueReminderRule(repository, trackingPush, noApns, config, makeLogger(), now);
    expect(attempted).toHaveLength(0);
    expect(repository.listNotificationDeliveries('stakeholder', 'due_reminder')).toHaveLength(0);

    repository.saveReminderNotificationPreferences('stakeholder', {
      enabled: true,
      dueRemindersEnabled: true,
      dailySummaryEnabled: false
    });
    repository.saveNotificationSubscription('stakeholder', validPushPayload.endpoint, validPushPayload);

    await evaluateDueReminderRule(repository, trackingPush, noApns, config, makeLogger(), now);
    await evaluateDueReminderRule(repository, trackingPush, noApns, config, makeLogger(), now);

    expect(attempted).toHaveLength(1);
    expect(attempted[0]).toContain('due-reminder-');
    expect(repository.listNotificationDeliveries('stakeholder', 'due_reminder')).toHaveLength(1);

    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('sends a daily summary only inside the configured window and at most once per day', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-jobs-'));
    const dbPath = join(directory, 'test.sqlite');
    const db = createDatabase(dbPath);
    const repository = new InboxRepository(db);
    const summaryWindowNow = new Date('2026-03-14T08:05:00.000Z');
    const outsideWindow = new Date('2026-03-14T07:05:00.000Z');

    const activeReminder = createReminder({
      id: crypto.randomUUID(),
      title: 'Water the herbs',
      note: null,
      owner: 'stakeholder',
      scheduledAt: addMinutes(summaryWindowNow, 45).toISOString(),
      recurrenceCadence: 'none',
      linkedInboxItemId: null
    }, summaryWindowNow);
    repository.createReminder(activeReminder.reminder, activeReminder.timelineEntries);
    repository.saveReminderNotificationPreferences('stakeholder', {
      enabled: true,
      dueRemindersEnabled: false,
      dailySummaryEnabled: true
    });
    repository.saveNotificationSubscription('stakeholder', validPushPayload.endpoint, validPushPayload);

    const attempted: string[] = [];
    const trackingPush: Parameters<typeof evaluateDailySummaryRule>[1] = {
      isConfigured: () => true,
      send: async (_subscription, notification) => {
        attempted.push(notification.tag);
      }
    };

    const config = { ...createConfig(dbPath), notificationsEnabled: true };
    await evaluateDailySummaryRule(repository, trackingPush, noApns, config, makeLogger(), outsideWindow);
    await evaluateDailySummaryRule(repository, trackingPush, noApns, config, makeLogger(), summaryWindowNow);
    await evaluateDailySummaryRule(repository, trackingPush, noApns, config, makeLogger(), summaryWindowNow);

    expect(attempted).toEqual(['daily-summary-2026-03-14']);
    expect(repository.listNotificationDeliveries('stakeholder', 'daily_summary')).toHaveLength(1);

    db.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('shared list api', () => {
  it('stakeholder can create a list, add items, check and uncheck items', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Create list
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Grocery Run' }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedList } = createRes.json();
    expect(savedList.title).toBe('Grocery Run');
    expect(savedList.status).toBe('active');
    expect(savedList.version).toBe(1);

    // Add item
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Oat milk' }
    });
    expect(addRes.statusCode).toBe(201);
    const { savedItem } = addRes.json();
    expect(savedItem.body).toBe('Oat milk');
    expect(savedItem.checked).toBe(false);

    // Check item
    const checkRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${savedItem.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedItem.version }
    });
    expect(checkRes.statusCode).toBe(200);
    const checkedItem = checkRes.json().savedItem;
    expect(checkedItem.checked).toBe(true);
    expect(checkedItem.checkedAt).not.toBeNull();

    // Uncheck item
    const uncheckRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${savedItem.id}/uncheck`,
      payload: { actorRole: 'stakeholder', expectedVersion: checkedItem.version }
    });
    expect(uncheckRes.statusCode).toBe(200);
    const uncheckedItem = uncheckRes.json().savedItem;
    expect(uncheckedItem.checked).toBe(false);
    expect(uncheckedItem.checkedAt).toBeNull();

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('stakeholder can archive and restore a list', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Packing List' }
    });
    const { savedList } = createRes.json();

    // Archive — requires confirmed: true
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedList.version, confirmed: true }
    });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json().savedList.status).toBe('archived');

    // Active index should not include the archived list
    const activeRes = await app.inject({
      method: 'GET',
      url: '/api/lists?actorRole=stakeholder'
    });
    expect(activeRes.json().lists.find((l: { id: string }) => l.id === savedList.id)).toBeUndefined();

    // Archived index should include it
    const archivedRes = await app.inject({
      method: 'GET',
      url: '/api/lists/archived?actorRole=stakeholder'
    });
    expect(archivedRes.json().lists.find((l: { id: string }) => l.id === savedList.id)).toBeDefined();

    // Restore
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/restore`,
      payload: { actorRole: 'stakeholder', expectedVersion: archiveRes.json().savedList.version }
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().savedList.status).toBe('active');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('stakeholder can permanently delete a list — requires confirmed: true', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'To Delete' }
    });
    const { savedList } = createRes.json();

    // Delete without confirmed should fail
    const badDeleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/lists/${savedList.id}`,
      payload: { actorRole: 'stakeholder' }
    });
    expect(badDeleteRes.statusCode).toBe(400);

    // Delete with confirmed: true
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/lists/${savedList.id}`,
      payload: { actorRole: 'stakeholder', confirmed: true }
    });
    expect(deleteRes.statusCode).toBe(204);

    // List should be gone
    const getRes = await app.inject({
      method: 'GET',
      url: `/api/lists/${savedList.id}?actorRole=stakeholder`
    });
    expect(getRes.statusCode).toBe(404);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('spouse has full read and write access to lists (multi-user household)', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Stakeholder creates a list with an item
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Shared List' }
    });
    const { savedList } = createRes.json();
    await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Buy milk' }
    });

    // Spouse can read list index
    const indexRes = await app.inject({ method: 'GET', url: '/api/lists?actorRole=spouse' });
    expect(indexRes.statusCode).toBe(200);
    expect(indexRes.json().lists).toHaveLength(1);

    // Spouse can read list detail
    const detailRes = await app.inject({ method: 'GET', url: `/api/lists/${savedList.id}?actorRole=spouse` });
    expect(detailRes.statusCode).toBe(200);
    expect(detailRes.json().items).toHaveLength(1);

    // Spouse can create a list
    const spouseCreateRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'spouse', title: 'Spouse List' }
    });
    expect(spouseCreateRes.statusCode).toBe(201);

    // Spouse can add an item
    const spouseAddItemRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'spouse', body: 'Eggs' }
    });
    expect(spouseAddItemRes.statusCode).toBe(201);

    // Spouse can check an item
    const items = detailRes.json().items;
    const spouseCheckRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${items[0].id}/check`,
      payload: { actorRole: 'spouse', expectedVersion: items[0].version }
    });
    expect(spouseCheckRes.statusCode).toBe(200);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('detects version conflicts on list and item updates', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Conflict Test' }
    });
    const { savedList } = createRes.json();

    // Stale version on title update
    const conflictRes = await app.inject({
      method: 'PATCH',
      url: `/api/lists/${savedList.id}/title`,
      payload: { actorRole: 'stakeholder', expectedVersion: 99, title: 'New Title' }
    });
    expect(conflictRes.statusCode).toBe(409);
    expect(conflictRes.json().code).toBe('VERSION_CONFLICT');

    // Add an item then use stale version
    const addRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Test Item' }
    });
    const { savedItem } = addRes.json();

    const itemConflictRes = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${savedItem.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: 99 }
    });
    expect(itemConflictRes.statusCode).toBe(409);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('archive and restore routes reject requests without confirmation signal', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Confirm Test' }
    });
    const { savedList } = createRes.json();

    // Archive without confirmed
    const badArchive = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedList.version }
    });
    expect(badArchive.statusCode).toBe(400);

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('list detail returns item count summary', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-lists-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Summary Test' }
    });
    const { savedList } = createRes.json();

    const item1Res = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Item A' }
    });
    const item2Res = await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Item B' }
    });
    const item1 = item1Res.json().savedItem;

    // Check one item
    await app.inject({
      method: 'POST',
      url: `/api/lists/${savedList.id}/items/${item1.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: item1.version }
    });

    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/lists/${savedList.id}?actorRole=stakeholder`
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.list.activeItemCount).toBe(2);
    expect(detail.list.checkedItemCount).toBe(1);
    expect(detail.list.allChecked).toBe(false);
    expect(detail.items).toHaveLength(2);
    void item2Res; // used for side effect

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('recurring routines api', () => {
  it('supports routine create, complete, pause, resume, archive, restore, and delete flows', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-routines-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    // Create a routine
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Take out trash',
        owner: 'stakeholder',
        recurrenceRule: 'weekly',
        firstDueDate: subDays(new Date(), 1).toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();
    expect(savedRoutine.title).toBe('Take out trash');
    expect(savedRoutine.dueState).toBe('overdue');

    // List routines
    const listRes = await app.inject({ method: 'GET', url: '/api/routines?actorRole=stakeholder' });
    expect(listRes.statusCode).toBe(200);
    expect(listRes.json().routines).toHaveLength(1);

    // Spouse can read
    const spouseListRes = await app.inject({ method: 'GET', url: '/api/routines?actorRole=spouse' });
    expect(spouseListRes.statusCode).toBe(200);

    // Spouse can also create routines (full write access)
    const spouseCreateRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'spouse',
        title: 'Spouse Routine',
        owner: 'spouse',
        recurrenceRule: 'daily',
        firstDueDate: new Date().toISOString()
      }
    });
    expect(spouseCreateRes.statusCode).toBe(201);

    // Complete routine — should advance due date by 1 week from original (schedule-anchored)
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version }
    });
    expect(completeRes.statusCode).toBe(200);
    const { savedRoutine: completedRoutine, occurrence } = completeRes.json();
    expect(occurrence.completedAt).toBeTruthy();
    expect(occurrence.dueDate).toBe(savedRoutine.currentDueDate);
    // After completion the routine should be upcoming (due date advanced by 1 week)
    expect(completedRoutine.dueState).toBe('upcoming');
    expect(completedRoutine.version).toBe(savedRoutine.version + 1);

    // Get routine detail including occurrence history
    const detailRes = await app.inject({
      method: 'GET',
      url: `/api/routines/${savedRoutine.id}?actorRole=stakeholder`
    });
    expect(detailRes.statusCode).toBe(200);
    const detail = detailRes.json();
    expect(detail.occurrences).toHaveLength(1);

    // Pause routine (requires confirmed: true)
    const pauseWithoutConfirm = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: completedRoutine.version }
    });
    expect(pauseWithoutConfirm.statusCode).toBe(400); // missing confirmed: true

    const pauseRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: completedRoutine.version, confirmed: true }
    });
    expect(pauseRes.statusCode).toBe(200);
    expect(pauseRes.json().savedRoutine.status).toBe('paused');
    expect(pauseRes.json().savedRoutine.dueState).toBe('paused');

    const pausedVersion = pauseRes.json().savedRoutine.version;

    // Resume routine
    const resumeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/resume`,
      payload: { actorRole: 'stakeholder', expectedVersion: pausedVersion }
    });
    expect(resumeRes.statusCode).toBe(200);
    expect(resumeRes.json().savedRoutine.status).toBe('active');

    const resumedVersion = resumeRes.json().savedRoutine.version;

    // Archive routine (requires confirmed: true)
    const archiveRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: resumedVersion, confirmed: true }
    });
    expect(archiveRes.statusCode).toBe(200);
    expect(archiveRes.json().savedRoutine.status).toBe('archived');

    const archivedVersion = archiveRes.json().savedRoutine.version;

    // Original routine should be archived; spouse routine remains active
    const activeAfterArchive = await app.inject({ method: 'GET', url: '/api/routines?actorRole=stakeholder' });
    expect(activeAfterArchive.json().routines).toHaveLength(1);
    expect(activeAfterArchive.json().routines[0].title).toBe('Spouse Routine');

    const archivedIndex = await app.inject({ method: 'GET', url: '/api/routines/archived?actorRole=stakeholder' });
    expect(archivedIndex.json().routines).toHaveLength(1);

    // Restore routine
    const restoreRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/restore`,
      payload: { actorRole: 'stakeholder', expectedVersion: archivedVersion }
    });
    expect(restoreRes.statusCode).toBe(200);
    expect(restoreRes.json().savedRoutine.status).toBe('active');
    expect(restoreRes.json().savedRoutine.archivedAt).toBeNull();

    const restoredVersion = restoreRes.json().savedRoutine.version;

    // Delete routine (requires confirmed: true)
    const deleteRes = await app.inject({
      method: 'DELETE',
      url: `/api/routines/${savedRoutine.id}`,
      payload: { actorRole: 'stakeholder', confirmed: true }
    });
    expect(deleteRes.statusCode).toBe(200);
    expect(deleteRes.json().deleted).toBe(true);
    void restoredVersion;

    // Original routine should be gone; spouse routine remains
    const afterDelete = await app.inject({ method: 'GET', url: '/api/routines?actorRole=stakeholder' });
    expect(afterDelete.json().routines).toHaveLength(1);
    expect(afterDelete.json().routines[0].title).toBe('Spouse Routine');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('supports every_n_days routine and version conflict detection', async () => {
    const directory = mkdtempSync(join(tmpdir(), 'olivia-routines2-'));
    const app = await buildApp({ config: createConfig(join(directory, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Deep clean',
        owner: 'stakeholder',
        recurrenceRule: 'every_n_days',
        intervalDays: 14,
        firstDueDate: subDays(new Date(), 1).toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();
    expect(savedRoutine.recurrenceRule).toBe('every_n_days');
    expect(savedRoutine.intervalDays).toBe(14);

    // Complete it
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version }
    });
    expect(completeRes.statusCode).toBe(200);

    // Stale version conflict
    const stalePauseRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version, confirmed: true }
    });
    expect(stalePauseRes.statusCode).toBe(409);
    expect(stalePauseRes.json().code).toBe('VERSION_CONFLICT');

    await app.close();
    rmSync(directory, { recursive: true, force: true });
  });
});

describe('unified weekly view api', () => {
  function makeDir() {
    return mkdtempSync(join(tmpdir(), 'olivia-weekly-'));
  }

  // Returns the ISO date string for the Monday of this calendar week (local time)
  function thisWeekMonday(): string {
    return format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
  }

  it('returns 7 days with empty arrays for an empty household', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.days).toHaveLength(7);
    for (const day of body.days) {
      expect(day.routines).toHaveLength(0);
      expect(day.reminders).toHaveLength(0);
      expect(day.meals).toHaveLength(0);
      expect(day.inboxItems).toHaveLength(0);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('places a reminder scheduled this week into the correct day', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    // Schedule reminder on Thursday of this week at noon
    const thisWeekThursday = startOfWeek(new Date(), { weekStartsOn: 1 });
    thisWeekThursday.setDate(thisWeekThursday.getDate() + 3);
    thisWeekThursday.setHours(12, 0, 0, 0);

    await createReminderViaApi(app, { scheduledAt: thisWeekThursday.toISOString() });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const thursdayDay = body.days[3]; // dayIndex 3 = Thursday
    expect(thursdayDay.reminders).toHaveLength(1);
    expect(thursdayDay.reminders[0].dueState).toBeDefined();

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('projects a daily routine occurrence into every day section of the week', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const mondayNoon = startOfWeek(new Date(), { weekStartsOn: 1 });
    mondayNoon.setHours(12, 0, 0, 0);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Daily vitamins',
        owner: 'stakeholder',
        recurrenceRule: 'daily',
        firstDueDate: mondayNoon.toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const day of body.days) {
      expect(day.routines).toHaveLength(1);
      expect(day.routines[0].routineTitle).toBe('Daily vitamins');
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('projects a weekly routine due Thursday only into Thursday', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const thursday = startOfWeek(new Date(), { weekStartsOn: 1 });
    thursday.setDate(thursday.getDate() + 3);
    thursday.setHours(12, 0, 0, 0);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Watering plants',
        owner: 'stakeholder',
        recurrenceRule: 'weekly',
        firstDueDate: thursday.toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const thursdayDay = body.days[3];
    expect(thursdayDay.routines).toHaveLength(1);
    for (let i = 0; i < 7; i++) {
      if (i !== 3) expect(body.days[i].routines).toHaveLength(0);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('places meal entries in the correct day sections when a meal plan exists for the week', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const weekStart = thisWeekMonday();

    const planRes = await app.inject({
      method: 'POST',
      url: '/api/meal-plans',
      payload: { actorRole: 'stakeholder', title: 'Week of meals', weekStartDate: weekStart }
    });
    expect(planRes.statusCode).toBe(201);
    const { plan: savedPlan } = planRes.json();

    await app.inject({
      method: 'POST',
      url: `/api/meal-plans/${savedPlan.id}/entries`,
      payload: { actorRole: 'stakeholder', dayOfWeek: 2, name: 'Pasta' }
    });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    const wednesdayDay = body.days[2];
    expect(wednesdayDay.meals).toHaveLength(1);
    expect(wednesdayDay.meals[0].name).toBe('Pasta');
    for (let i = 0; i < 7; i++) {
      if (i !== 2) expect(body.days[i].meals).toHaveLength(0);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty meal arrays when no active meal plan exists', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const day of body.days) {
      expect(day.meals).toHaveLength(0);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('places an inbox item due this week in the correct day section', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const tuesday = startOfWeek(new Date(), { weekStartsOn: 1 });
    tuesday.setDate(tuesday.getDate() + 1);
    tuesday.setHours(12, 0, 0, 0);

    await createInboxItemViaApi(app, 'Call the vet');
    const allRes = await app.inject({ method: 'GET', url: '/api/inbox/items?actorRole=stakeholder&view=all' });
    const item = allRes.json().itemsByStatus.open[0];
    await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: item.id,
        expectedVersion: item.version,
        approved: true,
        proposedChange: { dueAt: tuesday.toISOString() }
      }
    });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.days[1].inboxItems).toHaveLength(1);
    expect(body.days[1].inboxItems[0].title).toBe('Call the vet');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not include inbox items due last week', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    await createInboxItemViaApi(app, 'Old task');
    const allRes = await app.inject({ method: 'GET', url: '/api/inbox/items?actorRole=stakeholder&view=all' });
    const item = allRes.json().itemsByStatus.open[0];
    await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: item.id,
        expectedVersion: item.version,
        approved: true,
        proposedChange: { dueAt: subDays(new Date(), 8).toISOString() }
      }
    });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const day of body.days) {
      expect(day.inboxItems).toHaveLength(0);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('shared list items do not appear in any day section', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const listRes = await app.inject({
      method: 'POST',
      url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Grocery list' }
    });
    expect(listRes.statusCode).toBe(201);
    const list = listRes.json().savedList;
    await app.inject({
      method: 'POST',
      url: `/api/lists/${list.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Milk' }
    });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const day of body.days) {
      expect((day as Record<string, unknown>).lists).toBeUndefined();
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('accepts a specific weekStart query param and returns that week', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const weekStart = thisWeekMonday();
    const res = await app.inject({ method: 'GET', url: `/api/weekly-view?weekStart=${weekStart}` });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.weekStart).toBe(weekStart);
    expect(body.days).toHaveLength(7);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns 400 for invalid weekStart format', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view?weekStart=not-a-date' });
    expect(res.statusCode).toBe(400);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns 400 when weekStart is not a Monday', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const sunday = format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd');
    const res = await app.inject({ method: 'GET', url: `/api/weekly-view?weekStart=${sunday}` });
    expect(res.statusCode).toBe(400);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not show paused routines in any day', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const mondayNoon = startOfWeek(new Date(), { weekStartsOn: 1 });
    mondayNoon.setHours(12, 0, 0, 0);

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Paused routine',
        owner: 'stakeholder',
        recurrenceRule: 'daily',
        firstDueDate: mondayNoon.toISOString()
      }
    });
    const { savedRoutine } = createRes.json();

    await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/pause`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version, confirmed: true }
    });

    const res = await app.inject({ method: 'GET', url: '/api/weekly-view' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    for (const day of body.days) {
      expect(day.routines).toHaveLength(0);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('activity history api', () => {
  function makeDir() {
    return mkdtempSync(join(tmpdir(), 'olivia-history-'));
  }

  // Returns the Monday date string of last week (local time)
  function lastWeekMonday(): string {
    return format(subWeeks(startOfWeek(new Date(), { weekStartsOn: 1 }), 1), 'yyyy-MM-dd');
  }

  it('returns empty days array for an empty household', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.days).toEqual([]);
    expect(body.windowStart).toBeDefined();
    expect(body.windowEnd).toBeDefined();

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('completed routine occurrence in last 30 days appears as type routine', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    // Create a daily routine due today
    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Morning walk',
        owner: 'stakeholder',
        recurrenceRule: 'daily',
        firstDueDate: today.toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();

    // Complete it
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version }
    });
    expect(completeRes.statusCode).toBe(200);

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    expect(res.statusCode).toBe(200);
    const body = res.json();

    const allItems = body.days.flatMap((d: { items: unknown[] }) => d.items);
    const routineItems = allItems.filter((i: { type: string }) => i.type === 'routine');
    expect(routineItems.length).toBeGreaterThanOrEqual(1);
    expect((routineItems[0] as { routineTitle: string }).routineTitle).toBe('Morning walk');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('archived routine occurrences do not appear', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const today = new Date();
    today.setHours(10, 0, 0, 0);
    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Archived routine',
        owner: 'stakeholder',
        recurrenceRule: 'daily',
        firstDueDate: today.toISOString()
      }
    });
    const { savedRoutine } = createRes.json();

    // Complete first
    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: savedRoutine.version }
    });
    const { savedRoutine: completedRoutine } = completeRes.json();

    // Archive
    await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/archive`,
      payload: { actorRole: 'stakeholder', expectedVersion: completedRoutine.version, confirmed: true }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const routineItems = allItems.filter((i: { type: string }) => i.type === 'routine');
    expect(routineItems).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('completed reminder appears as type reminder with resolution completed', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const { savedReminder } = await createReminderViaApi(app);
    await app.inject({
      method: 'POST',
      url: '/api/reminders/complete',
      payload: { actorRole: 'stakeholder', reminderId: savedReminder.id, expectedVersion: savedReminder.version, approved: true }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const reminderItems = allItems.filter((i: { type: string }) => i.type === 'reminder');
    expect(reminderItems.length).toBeGreaterThanOrEqual(1);
    expect((reminderItems[0] as { resolution: string }).resolution).toBe('completed');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('dismissed (cancelled) reminder appears as type reminder with resolution dismissed', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const { savedReminder } = await createReminderViaApi(app);
    await app.inject({
      method: 'POST',
      url: '/api/reminders/cancel',
      payload: { actorRole: 'stakeholder', reminderId: savedReminder.id, expectedVersion: savedReminder.version, approved: true }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const reminderItems = allItems.filter((i: { type: string }) => i.type === 'reminder');
    expect(reminderItems.length).toBeGreaterThanOrEqual(1);
    expect((reminderItems[0] as { resolution: string }).resolution).toBe('dismissed');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('done inbox item appears as type inbox', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const item = await createInboxItemViaApi(app, 'Fix the gate');
    // Mark done
    await app.inject({
      method: 'POST',
      url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder',
        itemId: item.id,
        expectedVersion: item.version,
        approved: true,
        proposedChange: { status: 'done' }
      }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const inboxItems = allItems.filter((i: { type: string }) => i.type === 'inbox');
    expect(inboxItems.length).toBeGreaterThanOrEqual(1);
    expect((inboxItems[0] as { title: string }).title).toBe('Fix the gate');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('open inbox item does not appear', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    await createInboxItemViaApi(app, 'Open task stays open');

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const inboxItems = allItems.filter((i: { type: string }) => i.type === 'inbox');
    expect(inboxItems).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('checked list item appears as type listItem with listName', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const listRes = await app.inject({
      method: 'POST', url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Grocery List' }
    });
    const list = listRes.json().savedList;

    const addRes = await app.inject({
      method: 'POST', url: `/api/lists/${list.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Oat milk' }
    });
    const listItem = addRes.json().savedItem;

    await app.inject({
      method: 'POST', url: `/api/lists/${list.id}/items/${listItem.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: listItem.version }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const listItems = allItems.filter((i: { type: string }) => i.type === 'listItem');
    expect(listItems.length).toBeGreaterThanOrEqual(1);
    expect((listItems[0] as { listName: string; body: string }).listName).toBe('Grocery List');
    expect((listItems[0] as { body: string }).body).toBe('Oat milk');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('unchecked list item does not appear', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const listRes = await app.inject({
      method: 'POST', url: '/api/lists',
      payload: { actorRole: 'stakeholder', title: 'Shopping' }
    });
    const list = listRes.json().savedList;

    const addRes = await app.inject({
      method: 'POST', url: `/api/lists/${list.id}/items`,
      payload: { actorRole: 'stakeholder', body: 'Butter' }
    });
    const listItem = addRes.json().savedItem;
    // Check then uncheck
    const checkRes = await app.inject({
      method: 'POST', url: `/api/lists/${list.id}/items/${listItem.id}/check`,
      payload: { actorRole: 'stakeholder', expectedVersion: listItem.version }
    });
    const checkedItem = checkRes.json().savedItem;
    await app.inject({
      method: 'POST', url: `/api/lists/${list.id}/items/${listItem.id}/uncheck`,
      payload: { actorRole: 'stakeholder', expectedVersion: checkedItem.version }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const listItems = allItems.filter((i: { type: string }) => i.type === 'listItem');
    expect(listItems).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('past meal plan entry appears as type meal', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    // Create a meal plan for last week (which is "past" relative to current Monday)
    const lastMonday = lastWeekMonday();
    const createPlanRes = await app.inject({
      method: 'POST', url: '/api/meal-plans',
      payload: { actorRole: 'stakeholder', title: 'Last week', weekStartDate: lastMonday }
    });
    expect(createPlanRes.statusCode).toBe(201);
    const plan = createPlanRes.json().plan;

    // Add a meal entry for Monday (dayOfWeek=0) of that plan
    const addEntryRes = await app.inject({
      method: 'POST', url: `/api/meal-plans/${plan.id}/entries`,
      payload: { actorRole: 'stakeholder', dayOfWeek: 0, name: 'Pasta carbonara' }
    });
    expect(addEntryRes.statusCode).toBe(201);

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const mealItems = allItems.filter((i: { type: string }) => i.type === 'meal');
    expect(mealItems.length).toBeGreaterThanOrEqual(1);
    expect((mealItems[0] as { name: string }).name).toBe('Pasta carbonara');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('items older than 30 days do not appear', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });
    const db = new Database(join(dir, 'test.sqlite'));

    // Create a done inbox item via API and then backdate its last_status_changed_at to 35 days ago
    const item = await createInboxItemViaApi(app, 'Very old task');
    await app.inject({
      method: 'POST', url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder', itemId: item.id, expectedVersion: item.version,
        approved: true, proposedChange: { status: 'done' }
      }
    });

    const oldDate = subDays(new Date(), 35).toISOString();
    db.prepare('UPDATE inbox_items SET last_status_changed_at = ? WHERE id = ?').run(oldDate, item.id);
    db.close();

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const allItems = res.json().days.flatMap((d: { items: unknown[] }) => d.items);
    const inboxItems = allItems.filter((i: { type: string }) => i.type === 'inbox');
    expect(inboxItems).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('multiple items on same day appear in same day section sorted reverse-chronologically', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    // Create and complete two items on the same day (today)
    const item1 = await createInboxItemViaApi(app, 'Task one');
    await app.inject({
      method: 'POST', url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder', itemId: item1.id, expectedVersion: item1.version,
        approved: true, proposedChange: { status: 'done' }
      }
    });

    const item2 = await createInboxItemViaApi(app, 'Task two');
    await app.inject({
      method: 'POST', url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder', itemId: item2.id, expectedVersion: item2.version,
        approved: true, proposedChange: { status: 'done' }
      }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const body = res.json();
    const today = new Date().toISOString().split('T')[0];
    const todaySection = body.days.find((d: { date: string }) => d.date === today);
    expect(todaySection).toBeDefined();
    expect(todaySection.items.length).toBeGreaterThanOrEqual(2);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('days are ordered most-recent-first and empty days are suppressed', async () => {
    const dir = makeDir();
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const item = await createInboxItemViaApi(app, 'Some item');
    await app.inject({
      method: 'POST', url: '/api/inbox/items/confirm-update',
      payload: {
        actorRole: 'stakeholder', itemId: item.id, expectedVersion: item.version,
        approved: true, proposedChange: { status: 'done' }
      }
    });

    const res = await app.inject({ method: 'GET', url: '/api/activity-history' });
    const body = res.json();
    // All days should have at least one item (no empty days)
    for (const day of body.days) {
      expect(day.items.length).toBeGreaterThan(0);
    }
    // Days should be sorted most-recent-first
    for (let i = 1; i < body.days.length; i++) {
      expect(body.days[i - 1].date >= body.days[i].date).toBe(true);
    }

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('planning ritual AI summaries api', () => {
  function makeRitualRoutine(db: ReturnType<typeof createDatabase>) {
    const repo = new InboxRepository(db);
    const now = new Date();
    const ritual = {
      id: randomUUID(),
      title: 'Weekly Review',
      owner: 'stakeholder' as const,
      recurrenceRule: 'weekly' as const,
      intervalDays: null,
      status: 'active' as const,
      currentDueDate: now.toISOString(),
      ritualType: 'weekly_review' as const,
      intervalWeeks: null,
      weekdays: null,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
      archivedAt: null,
      freshnessCheckedAt: null,
      version: 1
    };
    repo.createRoutine(ritual);
    return ritual;
  }

  it('generate-ritual-summary returns stub drafts for a due weekly_review routine', async () => {

    const dir = mkdtempSync(join(tmpdir(), 'olivia-ritual-ai-'));
    const dbPath = join(dir, 'test.sqlite');
    const db = createDatabase(dbPath);
    const ritual = makeRitualRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });
    const occurrenceId = randomUUID();

    // Happy path — empty household → stub returns null drafts (no recap/overview data)
    const genRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${ritual.id}/generate-ritual-summary`,
      payload: { actorRole: 'stakeholder', occurrenceId }
    });
    expect(genRes.statusCode).toBe(200);
    const genBody = genRes.json();
    expect(genBody).toHaveProperty('recapDraft');
    expect(genBody).toHaveProperty('overviewDraft');

    // Spouse blocked
    const spouseRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${ritual.id}/generate-ritual-summary`,
      payload: { actorRole: 'spouse', occurrenceId }
    });
    expect(spouseRes.statusCode).toBe(403);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('generate-ritual-summary returns 404 for unknown routine', async () => {

    const dir = mkdtempSync(join(tmpdir(), 'olivia-ritual-ai2-'));
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/routines/00000000-0000-0000-0000-000000000000/generate-ritual-summary`,
      payload: { actorRole: 'stakeholder', occurrenceId: randomUUID() }
    });
    expect(res.statusCode).toBe(404);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('generate-ritual-summary returns 400 for non-ritual routine', async () => {

    const dir = mkdtempSync(join(tmpdir(), 'olivia-ritual-ai3-'));
    const app = await buildApp({ config: createConfig(join(dir, 'test.sqlite')) });

    const createRes = await app.inject({
      method: 'POST',
      url: '/api/routines',
      payload: {
        actorRole: 'stakeholder',
        title: 'Take out trash',
        owner: 'stakeholder',
        recurrenceRule: 'weekly',
        firstDueDate: new Date().toISOString()
      }
    });
    expect(createRes.statusCode).toBe(201);
    const { savedRoutine } = createRes.json();

    const res = await app.inject({
      method: 'POST',
      url: `/api/routines/${savedRoutine.id}/generate-ritual-summary`,
      payload: { actorRole: 'stakeholder', occurrenceId: randomUUID() }
    });
    expect(res.statusCode).toBe(400);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('complete-ritual stores accepted narratives and review-records returns them', async () => {

    const dir = mkdtempSync(join(tmpdir(), 'olivia-ritual-ai4-'));
    const dbPath = join(dir, 'test.sqlite');
    const db = createDatabase(dbPath);
    const ritual = makeRitualRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });
    const occurrenceId = randomUUID();

    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${ritual.id}/complete-ritual`,
      payload: {
        actorRole: 'stakeholder',
        occurrenceId,
        carryForwardNotes: null,
        recapNarrative: 'Last week was productive.',
        overviewNarrative: 'This week looks busy.'
      }
    });
    expect(completeRes.statusCode).toBe(200);
    const { reviewRecordId } = completeRes.json();

    // Stakeholder can read narrative fields
    const rrRes = await app.inject({
      method: 'GET',
      url: `/api/review-records/${reviewRecordId}?role=stakeholder`
    });
    expect(rrRes.statusCode).toBe(200);
    const rr = rrRes.json();
    expect(rr.recapNarrative).toBe('Last week was productive.');
    expect(rr.overviewNarrative).toBe('This week looks busy.');
    expect(rr.aiGenerationUsed).toBe(true);

    // Spouse can read narrative fields
    const spouseRrRes = await app.inject({
      method: 'GET',
      url: `/api/review-records/${reviewRecordId}?role=spouse`
    });
    expect(spouseRrRes.statusCode).toBe(200);
    expect(spouseRrRes.json().recapNarrative).toBe('Last week was productive.');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('complete-ritual without narratives stores null narrative fields', async () => {

    const dir = mkdtempSync(join(tmpdir(), 'olivia-ritual-ai5-'));
    const dbPath = join(dir, 'test.sqlite');
    const db = createDatabase(dbPath);
    const ritual = makeRitualRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${ritual.id}/complete-ritual`,
      payload: {
        actorRole: 'stakeholder',
        occurrenceId: randomUUID(),
        carryForwardNotes: 'Some notes here.'
      }
    });
    expect(completeRes.statusCode).toBe(200);
    const { reviewRecordId } = completeRes.json();

    const rrRes = await app.inject({
      method: 'GET',
      url: `/api/review-records/${reviewRecordId}?role=stakeholder`
    });
    expect(rrRes.statusCode).toBe(200);
    const rr = rrRes.json();
    expect(rr.recapNarrative).toBeNull();
    expect(rr.overviewNarrative).toBeNull();
    expect(rr.aiGenerationUsed).toBe(false);
    expect(rr.carryForwardNotes).toBe('Some notes here.');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('proactive household nudges api', () => {
  function makeDir() {
    const dir = mkdtempSync(join(tmpdir(), 'olivia-nudges-'));
    return { dir, dbPath: join(dir, 'test.sqlite') };
  }

  function makeOverdueRoutine(db: ReturnType<typeof createDatabase>) {
    const repo = new InboxRepository(db);
    const pastDate = subDays(new Date(), 3).toISOString();
    const routine: Parameters<typeof repo.createRoutine>[0] = {
      id: randomUUID(),
      title: 'Morning routine',
      owner: 'stakeholder',
      recurrenceRule: 'weekly',
      intervalDays: null,
      intervalWeeks: null,
      weekdays: null,
      status: 'active',
      currentDueDate: pastDate,
      ritualType: null,
      createdAt: pastDate,
      updatedAt: pastDate,
      archivedAt: null,
      freshnessCheckedAt: null,
      version: 1
    };
    repo.createRoutine(routine);
    return routine;
  }

  function makeOverduePlanningRitual(db: ReturnType<typeof createDatabase>) {
    const repo = new InboxRepository(db);
    const pastDate = subDays(new Date(), 5).toISOString();
    const ritual = {
      id: randomUUID(),
      title: 'Weekly household review',
      owner: 'stakeholder' as const,
      recurrenceRule: 'weekly' as const,
      intervalDays: null,
      status: 'active' as const,
      currentDueDate: pastDate,
      ritualType: 'weekly_review' as const,
      intervalWeeks: null,
      weekdays: null,
      createdAt: pastDate,
      updatedAt: pastDate,
      archivedAt: null,
      freshnessCheckedAt: null,
      version: 1
    };
    repo.createRoutine(ritual);
    return ritual;
  }

  it('returns empty nudges when no overdue items', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    expect(res.json().nudges).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns overdue routine nudge', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    makeOverdueRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });
    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    const { nudges } = res.json();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].entityType).toBe('routine');
    expect(nudges[0].entityName).toBe('Morning routine');
    expect(nudges[0].overdueSince).toBeTruthy();

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns planning ritual nudge with planningRitual entityType', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    makeOverduePlanningRitual(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });
    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    const { nudges } = res.json();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].entityType).toBe('planningRitual');
    expect(nudges[0].entityName).toBe('Weekly household review');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns approaching reminder nudge (within 24h)', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    await createReminderViaApi(app, {
      title: 'Vet appointment',
      scheduledAt: addHours(new Date(), 2).toISOString()
    });

    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    const { nudges } = res.json();
    expect(nudges).toHaveLength(1);
    expect(nudges[0].entityType).toBe('reminder');
    expect(nudges[0].entityName).toBe('Vet appointment');
    expect(nudges[0].dueAt).toBeTruthy();

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not return reminder due in 25h (outside threshold)', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    await createReminderViaApi(app, {
      title: 'Future appointment',
      scheduledAt: addHours(new Date(), 25).toISOString()
    });

    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    expect(res.json().nudges).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not return completed routine occurrence', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const routine = makeOverdueRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    const completeRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/complete`,
      payload: { actorRole: 'stakeholder', expectedVersion: 1 }
    });
    expect(completeRes.statusCode).toBe(200);

    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    expect(res.json().nudges).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('sorts planning ritual first, then reminder, then routine', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    makeOverdueRoutine(db);
    makeOverduePlanningRitual(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    await createReminderViaApi(app, {
      title: 'Grocery run',
      scheduledAt: addHours(new Date(), 1).toISOString()
    });

    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    const { nudges } = res.json();
    expect(nudges.length).toBeGreaterThanOrEqual(3);
    expect(nudges[0].entityType).toBe('planningRitual');
    expect(nudges[1].entityType).toBe('reminder');
    expect(nudges[2].entityType).toBe('routine');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('does not return resolved reminder', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const created = await createReminderViaApi(app, {
      title: 'Past reminder',
      scheduledAt: addHours(new Date(), 1).toISOString()
    });
    const reminder = created.savedReminder;

    const completeRes = await app.inject({
      method: 'POST',
      url: '/api/reminders/complete',
      payload: { actorRole: 'stakeholder', reminderId: reminder.id, expectedVersion: reminder.version, approved: true }
    });
    expect(completeRes.statusCode).toBe(200);

    const res = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(res.statusCode).toBe(200);
    expect(res.json().nudges).toHaveLength(0);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('skip routine endpoint: advances currentDueDate and sets skipped: true', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const routine = makeOverdueRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    const skipRes = await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/skip`,
      payload: { actorRole: 'stakeholder', expectedVersion: 1 }
    });
    expect(skipRes.statusCode).toBe(200);
    const body = skipRes.json();
    expect(body.occurrence.skipped).toBe(true);
    expect(new Date(body.savedRoutine.currentDueDate).getTime()).toBeGreaterThan(new Date(routine.currentDueDate!).getTime());

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('skip routine endpoint: allows spouse role (full write access)', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const routine = makeOverdueRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/skip`,
      payload: { actorRole: 'spouse', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(200);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('skip routine endpoint: 404 when routine not found', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/routines/${randomUUID()}/skip`,
      payload: { actorRole: 'stakeholder', expectedVersion: 1 }
    });
    expect(res.statusCode).toBe(404);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('skip routine endpoint: 409 on version conflict', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const routine = makeOverdueRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/skip`,
      payload: { actorRole: 'stakeholder', expectedVersion: 99 }
    });
    expect(res.statusCode).toBe(409);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('skip removes routine from nudge list on next poll', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const routine = makeOverdueRoutine(db);
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    const before = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(before.json().nudges.some((n: { entityId: string }) => n.entityId === routine.id)).toBe(true);

    await app.inject({
      method: 'POST',
      url: `/api/routines/${routine.id}/skip`,
      payload: { actorRole: 'stakeholder', expectedVersion: 1 }
    });

    const after = await app.inject({ method: 'GET', url: '/api/nudges?actorRole=stakeholder' });
    expect(after.json().nudges.some((n: { entityId: string }) => n.entityId === routine.id)).toBe(false);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

describe('onboarding api (OLI-119)', () => {
  function makeDir() {
    const dir = mkdtempSync(join(tmpdir(), 'olivia-onboarding-'));
    return { dir, dbPath: join(dir, 'test.sqlite') };
  }

  it('returns needsOnboarding=true for empty household', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });
    const res = await app.inject({ method: 'GET', url: '/api/onboarding/state' });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.needsOnboarding).toBe(true);
    expect(body.entityCount).toBe(0);
    expect(body.session).toBeNull();
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns needsOnboarding=false when household has more than 2 entities', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    // Create 3 inbox items to exceed threshold
    for (let i = 0; i < 3; i++) {
      await createInboxItemViaApi(app, `Item ${i}`);
    }

    const res = await app.inject({ method: 'GET', url: '/api/onboarding/state' });
    const body = res.json();
    expect(body.needsOnboarding).toBe(false);
    expect(body.entityCount).toBe(3);
    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns 503 for start when AI is unavailable', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({ method: 'POST', url: '/api/onboarding/start' });
    expect(res.statusCode).toBe(503);
    expect(res.json().code).toBe('AI_UNAVAILABLE');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('creates and manages onboarding session via repository directly', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const repo = new InboxRepository(db);
    const now = new Date();

    // Entity count starts at 0
    expect(repo.countTotalEntities()).toBe(0);

    // No session initially
    expect(repo.getOnboardingSession()).toBeNull();

    // Create onboarding conversation
    const conv = repo.getOrCreateOnboardingConversation(now);
    expect(conv.id).toBeTruthy();

    // Create session
    const sessionId = randomUUID();
    repo.createOnboardingSession({
      id: sessionId,
      conversationId: conv.id,
      status: 'started',
      topicsCompleted: [],
      currentTopic: 'tasks',
      entitiesCreated: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });

    const session = repo.getOnboardingSession();
    expect(session).toBeTruthy();
    expect(session!.status).toBe('started');
    expect(session!.currentTopic).toBe('tasks');
    expect(session!.topicsCompleted).toEqual([]);

    // Update topic
    repo.updateOnboardingSession(sessionId, {
      topicsCompleted: ['tasks'],
      currentTopic: 'routines',
      updatedAt: now.toISOString()
    });

    const updated = repo.getOnboardingSession();
    expect(updated!.topicsCompleted).toEqual(['tasks']);
    expect(updated!.currentTopic).toBe('routines');

    // Increment entities
    repo.incrementOnboardingEntitiesCreated(sessionId, 3, now);
    expect(repo.getOnboardingSession()!.entitiesCreated).toBe(3);

    // Finish
    repo.updateOnboardingSession(sessionId, {
      status: 'finished',
      currentTopic: null,
      updatedAt: now.toISOString()
    });
    expect(repo.getOnboardingSession()!.status).toBe('finished');

    db.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('advances through topics via API', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const repo = new InboxRepository(db);
    const now = new Date();

    // Manually create session (bypassing AI requirement of /start)
    const conv = repo.getOrCreateOnboardingConversation(now);
    const sessionId = randomUUID();
    repo.createOnboardingSession({
      id: sessionId,
      conversationId: conv.id,
      status: 'started',
      topicsCompleted: [],
      currentTopic: 'tasks',
      entitiesCreated: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    // Advance from tasks to routines
    const res1 = await app.inject({ method: 'POST', url: '/api/onboarding/next-topic' });
    expect(res1.statusCode).toBe(200);
    expect(res1.json().currentTopic).toBe('routines');
    expect(res1.json().topicsCompleted).toContain('tasks');

    // Advance through remaining topics
    const res2 = await app.inject({ method: 'POST', url: '/api/onboarding/next-topic' });
    expect(res2.json().currentTopic).toBe('reminders');

    const res3 = await app.inject({ method: 'POST', url: '/api/onboarding/next-topic' });
    expect(res3.json().currentTopic).toBe('lists');

    const res4 = await app.inject({ method: 'POST', url: '/api/onboarding/next-topic' });
    expect(res4.json().currentTopic).toBe('meals');

    // Final advance — all done
    const res5 = await app.inject({ method: 'POST', url: '/api/onboarding/next-topic' });
    expect(res5.json().done).toBe(true);
    expect(res5.json().topicsCompleted).toEqual(['tasks', 'routines', 'reminders', 'lists', 'meals']);

    // State should show finished
    const stateRes = await app.inject({ method: 'GET', url: '/api/onboarding/state' });
    expect(stateRes.json().session.status).toBe('finished');
    expect(stateRes.json().needsOnboarding).toBe(false);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('finishes onboarding early', async () => {
    const { dir, dbPath } = makeDir();
    const db = createDatabase(dbPath);
    const repo = new InboxRepository(db);
    const now = new Date();

    // Create session with one topic completed
    const conv = repo.getOrCreateOnboardingConversation(now);
    const sessionId = randomUUID();
    repo.createOnboardingSession({
      id: sessionId,
      conversationId: conv.id,
      status: 'started',
      topicsCompleted: ['tasks'],
      currentTopic: 'routines',
      entitiesCreated: 0,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString()
    });
    db.close();

    const app = await buildApp({ config: createConfig(dbPath) });

    // Finish early
    const res = await app.inject({ method: 'POST', url: '/api/onboarding/finish' });
    expect(res.statusCode).toBe(200);
    expect(res.json().session.status).toBe('finished');
    expect(res.json().session.topicsCompleted).toContain('routines');

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns 503 for onboarding message when AI unavailable', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: '/api/onboarding/messages',
      payload: { content: 'hello' }
    });
    expect(res.statusCode).toBe(503);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('returns empty conversation when no session exists', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({ method: 'GET', url: '/api/onboarding/conversation' });
    expect(res.statusCode).toBe(200);
    expect(res.json().conversationId).toBeNull();
    expect(res.json().messages).toEqual([]);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects next-topic when no active session', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({ method: 'POST', url: '/api/onboarding/next-topic' });
    expect(res.statusCode).toBe(400);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('tracks entity count across session start and state', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    // Start onboarding
    await app.inject({ method: 'POST', url: '/api/onboarding/start' });

    // Create an inbox item
    await createInboxItemViaApi(app, 'Test task');

    // State should reflect entity count
    const stateRes = await app.inject({ method: 'GET', url: '/api/onboarding/state' });
    expect(stateRes.json().entityCount).toBe(1);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});

// ─── Error Reporting Endpoint ───────────────────────────────────────────────

describe('POST /api/errors', () => {
  function makeDir() {
    const dir = mkdtempSync(join(tmpdir(), 'olivia-errors-'));
    return { dir, dbPath: join(dir, 'test.sqlite') };
  }

  it('accepts a valid error report and returns 202', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: '/api/errors',
      payload: {
        message: 'Test error',
        source: 'fe',
        stack: 'Error: Test error\n  at test.ts:1',
      },
    });

    expect(res.statusCode).toBe(202);
    expect(res.json()).toEqual({ accepted: true });

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });

  it('rejects invalid payload with 400', async () => {
    const { dir, dbPath } = makeDir();
    const app = await buildApp({ config: createConfig(dbPath) });

    const res = await app.inject({
      method: 'POST',
      url: '/api/errors',
      payload: { message: '' },
    });

    expect(res.statusCode).toBe(400);

    await app.close();
    rmSync(dir, { recursive: true, force: true });
  });
});
