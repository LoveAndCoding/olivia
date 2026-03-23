import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { buildApp } from '../src/app';
import type { AppConfig } from '../src/config';
import { createDatabase } from '../src/db/client';
import { evaluateNudgePushRule } from '../src/jobs';
import type { PushProvider, NotificationPayload, PushSubscriptionPayload } from '../src/push';
import { isApnsSubscriptionPayload, DisabledApnsPushProvider } from '../src/push';
import { InboxRepository } from '../src/repository';

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

const makeLogger = () =>
  ({ info: () => {}, warn: () => {}, debug: () => {}, error: () => {} }) as unknown as Parameters<typeof evaluateNudgePushRule>[4];

const disabledApns = new DisabledApnsPushProvider();

function createMockPush(configured = true): PushProvider & { sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> } {
  const sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> = [];
  return {
    sends,
    isConfigured: () => configured,
    send: async (sub, notification) => { sends.push({ sub, notification }); },
  };
}

function create410Push(): PushProvider & { sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> } {
  const sends: Array<{ sub: PushSubscriptionPayload; notification: NotificationPayload }> = [];
  return {
    sends,
    isConfigured: () => true,
    send: async () => {
      const err = new Error('Gone') as Error & { statusCode: number };
      err.statusCode = 410;
      throw err;
    },
  };
}

// Helper: insert an overdue routine directly so nudge payloads exist
function insertOverdueRoutine(db: ReturnType<typeof createDatabase>, id: string, title: string, dueDate: string) {
  db.prepare(`
    INSERT INTO routines (id, title, owner, recurrence_rule, interval_days, status, current_due_date, created_at, updated_at, version)
    VALUES (?, ?, 'stakeholder', 'every_n_days', 7, 'active', ?, datetime('now'), datetime('now'), 1)
  `).run(id, title, dueDate);
}

describe('push subscription API endpoints', () => {
  let directory: string;
  let dbPath: string;
  let app: Awaited<ReturnType<typeof buildApp>>;

  beforeEach(async () => {
    directory = mkdtempSync(join(tmpdir(), 'olivia-push-'));
    dbPath = join(directory, 'test.sqlite');
    const config = createConfig(dbPath);
    app = await buildApp({ config });
  });

  afterEach(() => {
    rmSync(directory, { recursive: true, force: true });
  });

  it('GET /api/push-subscriptions/vapid-public-key returns null when not configured', async () => {
    const res = await app.inject({ method: 'GET', url: '/api/push-subscriptions/vapid-public-key' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toEqual({ vapidPublicKey: null });
  });

  it('POST /api/push-subscriptions with valid body returns 201', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub1',
        keys: { p256dh: 'test-p256dh', auth: 'test-auth' },
      },
    });
    expect(res.statusCode).toBe(201);
    const body = res.json();
    expect(body.id).toBeDefined();
    expect(body.endpoint).toBe('https://push.example.com/sub1');
  });

  it('POST /api/push-subscriptions with missing keys.p256dh returns 400', async () => {
    const res = await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub1',
        keys: { auth: 'test-auth' },
      },
    });
    expect(res.statusCode).toBe(400);
  });

  it('DELETE /api/push-subscriptions removes the subscription', async () => {
    await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub-to-delete',
        keys: { p256dh: 'key1', auth: 'auth1' },
      },
    });

    const delRes = await app.inject({
      method: 'DELETE',
      url: '/api/push-subscriptions',
      query: { endpoint: 'https://push.example.com/sub-to-delete' },
    });
    expect(delRes.statusCode).toBe(204);

    // Verify it's gone by trying to subscribe again (should get a new ID)
    const res2 = await app.inject({
      method: 'POST',
      url: '/api/push-subscriptions',
      payload: {
        endpoint: 'https://push.example.com/sub-to-delete',
        keys: { p256dh: 'key2', auth: 'auth2' },
      },
    });
    expect(res2.statusCode).toBe(201);
  });

  it('DELETE /api/push-subscriptions without endpoint query param returns 400', async () => {
    const res = await app.inject({ method: 'DELETE', url: '/api/push-subscriptions' });
    expect(res.statusCode).toBe(400);
  });
});

describe('evaluateNudgePushRule', () => {
  let directory: string;
  let db: ReturnType<typeof createDatabase>;
  let repository: InboxRepository;
  let config: AppConfig;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'olivia-nudge-push-'));
    const dbPath = join(directory, 'test.sqlite');
    db = createDatabase(dbPath);
    repository = new InboxRepository(db);
    config = createConfig(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('returns early when push is not configured', async () => {
    const push = createMockPush(false);
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger());
    expect(push.sends).toHaveLength(0);
  });

  it('returns early when no push subscriptions exist', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(0);
  });

  it('returns early when no active nudges exist', async () => {
    const push = createMockPush();
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger());
    expect(push.sends).toHaveLength(0);
  });

  it('sends push for an active nudge', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);
    expect(push.sends[0].notification.title).toBe('Olivia household nudge');
    expect(push.sends[0].notification.body).toContain('Take out trash');
  });

  it('dedup: item within 2h window is not re-pushed', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);

    // Second run within the 2h window
    const nowPlus1h = new Date(now.getTime() + 60 * 60 * 1000);
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), nowPlus1h);
    expect(push.sends).toHaveLength(1); // still 1, not 2
  });

  it('dedup: item outside 2h window is re-pushed', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);

    // Run again 3 hours later (outside 2h window)
    const nowPlus3h = new Date(now.getTime() + 3 * 60 * 60 * 1000);
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), nowPlus3h);
    expect(push.sends).toHaveLength(2);
  });

  it('410 cleanup: subscription removed on 410 response', async () => {
    const push = create410Push();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    expect(repository.listPushSubscriptions()).toHaveLength(1);
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(repository.listPushSubscriptions()).toHaveLength(0);
  });

  it('purges stale log entries older than 48h', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');
    const sub = repository.savePushSubscription('https://push.example.com/sub', 'p256dh-val', 'auth-val');

    // Record a log entry 72 hours ago
    const oldTime = new Date(now.getTime() - 72 * 60 * 60 * 1000);
    repository.recordPushNotificationLog(sub.id, 'routine', 'r-old', oldTime);

    // Verify it exists
    const countBefore = (db.prepare('SELECT COUNT(*) as cnt FROM push_notification_log').get() as { cnt: number }).cnt;
    expect(countBefore).toBe(1);

    // Run the rule which purges stale entries
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);

    // Old entry should be purged
    const countAfter = (db.prepare("SELECT COUNT(*) as cnt FROM push_notification_log WHERE entity_id = 'r-old'").get() as { cnt: number }).cnt;
    expect(countAfter).toBe(0);
  });
});

// ─── Completion Window Push Timing (H5 Phase 2 Layer 1) ─────────────────────

function insertCompletedOccurrences(
  db: ReturnType<typeof createDatabase>,
  routineId: string,
  completedAtTimes: string[]
) {
  for (const completedAt of completedAtTimes) {
    const id = crypto.randomUUID();
    db.prepare(`
      INSERT INTO routine_occurrences (id, routine_id, due_date, completed_at, completed_by, skipped, created_at)
      VALUES (?, ?, ?, ?, 'stakeholder', 0, datetime('now'))
    `).run(id, routineId, completedAt.slice(0, 10), completedAt);
  }
}

describe('completion window push timing', () => {
  let directory: string;
  let db: ReturnType<typeof createDatabase>;
  let repository: InboxRepository;
  let config: AppConfig;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'olivia-cw-push-'));
    const dbPath = join(directory, 'test.sqlite');
    db = createDatabase(dbPath);
    repository = new InboxRepository(db);
    config = createConfig(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('holds push when current time is before completion window', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z'); // 10am UTC — well before evening window
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(0);
  });

  it('delivers push when current time is within completion window', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T19:30:00Z'); // 7:30pm UTC — within window
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);
  });

  it('delivers immediately when routine has fewer than 4 completions', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T06:00:00Z'); // 6am — would be held if window existed
    insertOverdueRoutine(db, 'r1', 'New routine', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T20:00:00Z', '2026-03-08T20:30:00Z', // only 2 completions
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);
  });

  it('delivers reminder nudge immediately regardless of completion windows', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T06:00:00Z');
    // Insert approaching reminder due in 2 hours
    db.prepare(`
      INSERT INTO reminders (id, title, owner, recurrence_cadence, scheduled_at, created_at, updated_at, version)
      VALUES ('rem1', 'Call dentist', 'stakeholder', 'none', ?, datetime('now'), datetime('now'), 1)
    `).run(new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString());
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);
  });

  it('bypasses window when routine overdue > 2 days', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T06:00:00Z'); // 6am — before any evening window
    // Overdue since March 12 → 3 days overdue
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-12T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-04T19:00:00Z', '2026-03-05T19:30:00Z',
      '2026-03-06T20:00:00Z', '2026-03-07T20:15:00Z',
      '2026-03-08T20:30:00Z', '2026-03-09T21:00:00Z',
      '2026-03-03T21:00:00Z', '2026-03-02T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    expect(push.sends).toHaveLength(1);
  });

  it('does not create dedup log entry for held nudges', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);
    const logCount = (db.prepare('SELECT COUNT(*) as cnt FROM push_notification_log').get() as { cnt: number }).cnt;
    expect(logCount).toBe(0);
  });

  it('held nudge delivers on next cycle when window opens', async () => {
    const push = createMockPush();
    insertOverdueRoutine(db, 'r1', 'Evening cleanup', '2026-03-14T08:00:00Z');
    insertCompletedOccurrences(db, 'r1', [
      '2026-03-07T19:00:00Z', '2026-03-08T19:30:00Z',
      '2026-03-09T20:00:00Z', '2026-03-10T20:15:00Z',
      '2026-03-11T20:30:00Z', '2026-03-12T21:00:00Z',
      '2026-03-06T21:00:00Z', '2026-03-05T22:00:00Z',
    ]);
    repository.savePushSubscription('https://push.example.com/sub', 'key', 'auth');

    // First cycle: 10am → held
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), new Date('2026-03-15T10:00:00Z'));
    expect(push.sends).toHaveLength(0);

    // Second cycle: 7:30pm → within window → delivered
    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), new Date('2026-03-15T19:30:00Z'));
    expect(push.sends).toHaveLength(1);
  });
});

// ─── Per-User Push Targeting (OLI-286) ──────────────────────────────────────

function insertUser(db: ReturnType<typeof createDatabase>, id: string, email: string, role = 'admin') {
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO users (id, name, email, household_id, role, created_at, updated_at)
    VALUES (?, ?, ?, 'household', ?, ?, ?)
  `).run(id, email.split('@')[0], email, role, now, now);
}

function insertReminder(db: ReturnType<typeof createDatabase>, id: string, title: string, scheduledAt: string, createdByUserId?: string) {
  db.prepare(`
    INSERT INTO reminders (id, title, owner, created_by_user_id, recurrence_cadence, scheduled_at, created_at, updated_at, version)
    VALUES (?, ?, 'stakeholder', ?, 'none', ?, datetime('now'), datetime('now'), 1)
  `).run(id, title, createdByUserId ?? null, scheduledAt);
}

describe('per-user push targeting', () => {
  let directory: string;
  let db: ReturnType<typeof createDatabase>;
  let repository: InboxRepository;
  let config: AppConfig;

  beforeEach(() => {
    directory = mkdtempSync(join(tmpdir(), 'olivia-user-push-'));
    const dbPath = join(directory, 'test.sqlite');
    db = createDatabase(dbPath);
    repository = new InboxRepository(db);
    config = createConfig(dbPath);
  });

  afterEach(() => {
    db.close();
    rmSync(directory, { recursive: true, force: true });
  });

  it('saves push subscription with userId', () => {
    insertUser(db, 'user-1', 'alice@test.com');
    const sub = repository.savePushSubscription('https://push.example.com/sub1', 'key', 'auth', 'user-1');
    expect(sub.user_id).toBe('user-1');
  });

  it('listPushSubscriptionsForUser returns only that user subscriptions', () => {
    insertUser(db, 'user-1', 'alice@test.com');
    insertUser(db, 'user-2', 'bob@test.com', 'member');
    repository.savePushSubscription('https://push.example.com/alice', 'key1', 'auth1', 'user-1');
    repository.savePushSubscription('https://push.example.com/bob', 'key2', 'auth2', 'user-2');

    const aliceSubs = repository.listPushSubscriptionsForUser('user-1');
    expect(aliceSubs).toHaveLength(1);
    expect(aliceSubs[0].endpoint).toBe('https://push.example.com/alice');

    const allSubs = repository.listPushSubscriptions();
    expect(allSubs).toHaveLength(2);
  });

  it('reminder nudge targets only the creator user subscriptions', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertUser(db, 'user-1', 'alice@test.com');
    insertUser(db, 'user-2', 'bob@test.com', 'member');

    // Alice's reminder, approaching in 2 hours
    insertReminder(db, 'rem1', 'Call dentist', new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), 'user-1');

    // Both users have push subscriptions
    repository.savePushSubscription('https://push.example.com/alice', 'key1', 'auth1', 'user-1');
    repository.savePushSubscription('https://push.example.com/bob', 'key2', 'auth2', 'user-2');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);

    // Only Alice's subscription should receive the reminder nudge
    expect(push.sends).toHaveLength(1);
    expect(push.sends[0].sub.endpoint).toBe('https://push.example.com/alice');
  });

  it('routine nudge broadcasts to all user subscriptions', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertUser(db, 'user-1', 'alice@test.com');
    insertUser(db, 'user-2', 'bob@test.com', 'member');

    insertOverdueRoutine(db, 'r1', 'Take out trash', '2026-03-14T08:00:00Z');

    repository.savePushSubscription('https://push.example.com/alice', 'key1', 'auth1', 'user-1');
    repository.savePushSubscription('https://push.example.com/bob', 'key2', 'auth2', 'user-2');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);

    // Both users should receive the routine nudge
    expect(push.sends).toHaveLength(2);
  });

  it('reminder nudge falls back to all subscriptions when creator has none', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');
    insertUser(db, 'user-1', 'alice@test.com');
    insertUser(db, 'user-2', 'bob@test.com', 'member');

    // Alice's reminder, but Alice has no push subscription
    insertReminder(db, 'rem1', 'Call dentist', new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString(), 'user-1');

    // Only Bob has a push subscription
    repository.savePushSubscription('https://push.example.com/bob', 'key2', 'auth2', 'user-2');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);

    // Falls back to all subscriptions (Bob gets it)
    expect(push.sends).toHaveLength(1);
    expect(push.sends[0].sub.endpoint).toBe('https://push.example.com/bob');
  });

  it('reminder nudge without creator broadcasts to all', async () => {
    const push = createMockPush();
    const now = new Date('2026-03-15T10:00:00Z');

    // Reminder with no created_by_user_id (legacy data)
    insertReminder(db, 'rem1', 'Call dentist', new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString());

    repository.savePushSubscription('https://push.example.com/sub1', 'key1', 'auth1');
    repository.savePushSubscription('https://push.example.com/sub2', 'key2', 'auth2');

    await evaluateNudgePushRule(repository, push, disabledApns, config, makeLogger(), now);

    // Both subscriptions should receive it (no user targeting)
    expect(push.sends).toHaveLength(2);
  });
});

describe('isApnsSubscriptionPayload', () => {
  it('returns true for valid APNs payloads', () => {
    expect(isApnsSubscriptionPayload({ type: 'apns', token: 'abc123' })).toBe(true);
  });

  it('returns false for web push payloads', () => {
    expect(isApnsSubscriptionPayload({
      endpoint: 'https://push.example.com/sub',
      keys: { p256dh: 'key1', auth: 'key2' },
    })).toBe(false);
  });

  it('returns false when token is missing', () => {
    expect(isApnsSubscriptionPayload({ type: 'apns' })).toBe(false);
  });

  it('returns false when type is not apns', () => {
    expect(isApnsSubscriptionPayload({ type: 'web', token: 'abc' })).toBe(false);
  });
});

describe('DisabledApnsPushProvider', () => {
  it('reports not configured', () => {
    const provider = new DisabledApnsPushProvider();
    expect(provider.isConfigured()).toBe(false);
  });

  it('send is a no-op', async () => {
    const provider = new DisabledApnsPushProvider();
    await expect(provider.send('token', { title: 'Test', body: 'Body', url: '/', tag: 'test' })).resolves.toBeUndefined();
  });
});
