import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { computeReminderState } from '@olivia/domain';
import {
  historyEntrySchema,
  inboxItemSchema,
  notificationSubscriptionSchema,
  reminderNotificationPreferencesSchema,
  reminderSchema,
  reminderTimelineEntrySchema,
  type ActorRole,
  type HistoryEntry,
  type InboxItem,
  type NotificationSubscription,
  type Reminder,
  type ReminderNotificationPreferences,
  type ReminderTimelineEntry
} from '@olivia/contracts';

const DEFAULT_REMINDER_PREFERENCES_UPDATED_AT = new Date(0).toISOString();

const REMINDER_SELECT = `
  SELECT
    reminders.*,
    inbox_items.id AS linked_item_id,
    inbox_items.title AS linked_item_title,
    inbox_items.status AS linked_item_status,
    inbox_items.owner AS linked_item_owner,
    inbox_items.due_at AS linked_item_due_at
  FROM reminders
  LEFT JOIN inbox_items ON inbox_items.id = reminders.linked_inbox_item_id
`;

export type NotificationDeliveryRecord = {
  id: string;
  notificationType: 'due_reminder' | 'daily_summary';
  actorRole: ActorRole;
  reminderId: string | null;
  deliveryBucket: string;
  deliveredAt: string;
};

const parseJsonColumn = (value: unknown): unknown => (value ? JSON.parse(String(value)) : null);

const mapItemRow = (row: Record<string, unknown>): InboxItem =>
  inboxItemSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    owner: row.owner,
    status: row.status,
    dueAt: row.due_at ?? null,
    dueText: row.due_text ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    lastStatusChangedAt: row.last_status_changed_at,
    lastNoteAt: row.last_note_at ?? null,
    archivedAt: row.archived_at ?? null
  });

const mapHistoryRow = (row: Record<string, unknown>): HistoryEntry =>
  historyEntrySchema.parse({
    id: row.id,
    itemId: row.item_id,
    actorRole: row.actor_role,
    eventType: row.event_type,
    fromValue: parseJsonColumn(row.from_value),
    toValue: parseJsonColumn(row.to_value),
    createdAt: row.created_at
  });

const mapReminderRow = (row: Record<string, unknown>, now: Date = new Date()): Reminder => {
  const reminderBase = {
    id: String(row.id),
    title: String(row.title),
    note: row.note ? String(row.note) : null,
    owner: row.owner,
    scheduledAt: String(row.scheduled_at),
    recurrenceCadence: row.recurrence_cadence,
    linkedInboxItemId: row.linked_inbox_item_id ? String(row.linked_inbox_item_id) : null,
    linkedInboxItem: row.linked_item_id
      ? {
          id: String(row.linked_item_id),
          title: String(row.linked_item_title),
          status: row.linked_item_status,
          owner: row.linked_item_owner,
          dueAt: row.linked_item_due_at ? String(row.linked_item_due_at) : null
        }
      : null,
    snoozedUntil: row.snoozed_until ? String(row.snoozed_until) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
    version: Number(row.version),
    state: 'upcoming' as const
  };

  return reminderSchema.parse({
    ...reminderBase,
    state: computeReminderState(reminderBase as Reminder, now)
  });
};

const mapReminderTimelineRow = (row: Record<string, unknown>): ReminderTimelineEntry =>
  reminderTimelineEntrySchema.parse({
    id: row.id,
    reminderId: row.reminder_id,
    actorRole: row.actor_role,
    eventType: row.event_type,
    fromValue: parseJsonColumn(row.from_value),
    toValue: parseJsonColumn(row.to_value),
    metadata: parseJsonColumn(row.metadata),
    createdAt: row.created_at
  });

const mapReminderPreferencesRow = (
  actorRole: ReminderNotificationPreferences['actorRole'],
  row?: Record<string, unknown>
): ReminderNotificationPreferences =>
  reminderNotificationPreferencesSchema.parse({
    actorRole,
    enabled: row ? Boolean(row.enabled) : false,
    dueRemindersEnabled: row ? Boolean(row.due_reminders_enabled) : false,
    dailySummaryEnabled: row ? Boolean(row.daily_summary_enabled) : false,
    updatedAt: row?.updated_at ?? DEFAULT_REMINDER_PREFERENCES_UPDATED_AT
  });

export class InboxRepository {
  constructor(private readonly db: Database.Database) {}

  listItems(): InboxItem[] {
    const rows = this.db.prepare('SELECT * FROM inbox_items ORDER BY updated_at DESC').all() as Record<string, unknown>[];
    return rows.map(mapItemRow);
  }

  getItem(itemId: string): InboxItem | null {
    const row = this.db.prepare('SELECT * FROM inbox_items WHERE id = ?').get(itemId) as Record<string, unknown> | undefined;
    return row ? mapItemRow(row) : null;
  }

  listHistory(itemId: string): HistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM inbox_item_history WHERE item_id = ? ORDER BY created_at DESC')
      .all(itemId) as Record<string, unknown>[];
    return rows.map(mapHistoryRow);
  }

  createItem(item: InboxItem, historyEntry: HistoryEntry): void {
    const insertItem = this.db.prepare(`
      INSERT INTO inbox_items (
        id, title, description, owner, status, due_at, due_text, created_at, updated_at, version, last_status_changed_at, last_note_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO inbox_item_history (id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertItem.run(
        item.id,
        item.title,
        item.description,
        item.owner,
        item.status,
        item.dueAt,
        item.dueText,
        item.createdAt,
        item.updatedAt,
        item.version,
        item.lastStatusChangedAt,
        item.lastNoteAt,
        item.archivedAt
      );
      insertHistory.run(
        historyEntry.id,
        historyEntry.itemId,
        historyEntry.actorRole,
        historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
    });

    transaction();
  }

  updateItem(item: InboxItem, historyEntry: HistoryEntry, expectedVersion: number): boolean {
    const updateItem = this.db.prepare(`
      UPDATE inbox_items
      SET title = ?, description = ?, owner = ?, status = ?, due_at = ?, due_text = ?, updated_at = ?, version = ?, last_status_changed_at = ?, last_note_at = ?, archived_at = ?
      WHERE id = ? AND version = ?
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO inbox_item_history (id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      const result = updateItem.run(
        item.title,
        item.description,
        item.owner,
        item.status,
        item.dueAt,
        item.dueText,
        item.updatedAt,
        item.version,
        item.lastStatusChangedAt,
        item.lastNoteAt,
        item.archivedAt,
        item.id,
        expectedVersion
      );
      if (result.changes === 0) {
        return false;
      }
      insertHistory.run(
        historyEntry.id,
        historyEntry.itemId,
        historyEntry.actorRole,
        historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
      return true;
    });

    return transaction();
  }

  listReminders(now: Date = new Date()): Reminder[] {
    const rows = this.db
      .prepare(`${REMINDER_SELECT} ORDER BY COALESCE(reminders.snoozed_until, reminders.scheduled_at) ASC, reminders.updated_at DESC`)
      .all() as Record<string, unknown>[];
    return rows.map((row) => mapReminderRow(row, now));
  }

  getReminder(reminderId: string, now: Date = new Date()): Reminder | null {
    const row = this.db
      .prepare(`${REMINDER_SELECT} WHERE reminders.id = ?`)
      .get(reminderId) as Record<string, unknown> | undefined;
    return row ? mapReminderRow(row, now) : null;
  }

  listReminderTimeline(reminderId: string): ReminderTimelineEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM reminder_timeline WHERE reminder_id = ? ORDER BY created_at DESC, id DESC')
      .all(reminderId) as Record<string, unknown>[];
    return rows.map(mapReminderTimelineRow);
  }

  createReminder(reminder: Reminder, timelineEntries: ReminderTimelineEntry[]): void {
    const insertReminder = this.db.prepare(`
      INSERT INTO reminders (
        id, title, note, owner, linked_inbox_item_id, recurrence_cadence, scheduled_at, snoozed_until,
        completed_at, cancelled_at, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTimeline = this.db.prepare(`
      INSERT INTO reminder_timeline (id, reminder_id, actor_role, event_type, from_value, to_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      insertReminder.run(
        reminder.id,
        reminder.title,
        reminder.note,
        reminder.owner,
        reminder.linkedInboxItemId,
        reminder.recurrenceCadence,
        reminder.scheduledAt,
        reminder.snoozedUntil,
        reminder.completedAt,
        reminder.cancelledAt,
        reminder.createdAt,
        reminder.updatedAt,
        reminder.version
      );

      for (const timelineEntry of timelineEntries) {
        insertTimeline.run(
          timelineEntry.id,
          timelineEntry.reminderId,
          timelineEntry.actorRole,
          timelineEntry.eventType,
          timelineEntry.fromValue ? JSON.stringify(timelineEntry.fromValue) : null,
          timelineEntry.toValue ? JSON.stringify(timelineEntry.toValue) : null,
          timelineEntry.metadata ? JSON.stringify(timelineEntry.metadata) : null,
          timelineEntry.createdAt
        );
      }
    })();
  }

  appendReminderTimelineEntries(timelineEntries: ReminderTimelineEntry[]): void {
    if (timelineEntries.length === 0) {
      return;
    }

    const insertTimeline = this.db.prepare(`
      INSERT OR IGNORE INTO reminder_timeline (id, reminder_id, actor_role, event_type, from_value, to_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const timelineEntry of timelineEntries) {
        insertTimeline.run(
          timelineEntry.id,
          timelineEntry.reminderId,
          timelineEntry.actorRole,
          timelineEntry.eventType,
          timelineEntry.fromValue ? JSON.stringify(timelineEntry.fromValue) : null,
          timelineEntry.toValue ? JSON.stringify(timelineEntry.toValue) : null,
          timelineEntry.metadata ? JSON.stringify(timelineEntry.metadata) : null,
          timelineEntry.createdAt
        );
      }
    })();
  }

  updateReminder(reminder: Reminder, timelineEntries: ReminderTimelineEntry[], expectedVersion: number): boolean {
    const updateReminder = this.db.prepare(`
      UPDATE reminders
      SET title = ?, note = ?, owner = ?, linked_inbox_item_id = ?, recurrence_cadence = ?, scheduled_at = ?,
          snoozed_until = ?, completed_at = ?, cancelled_at = ?, updated_at = ?, version = ?
      WHERE id = ? AND version = ?
    `);
    const insertTimeline = this.db.prepare(`
      INSERT INTO reminder_timeline (id, reminder_id, actor_role, event_type, from_value, to_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return this.db.transaction(() => {
      const result = updateReminder.run(
        reminder.title,
        reminder.note,
        reminder.owner,
        reminder.linkedInboxItemId,
        reminder.recurrenceCadence,
        reminder.scheduledAt,
        reminder.snoozedUntil,
        reminder.completedAt,
        reminder.cancelledAt,
        reminder.updatedAt,
        reminder.version,
        reminder.id,
        expectedVersion
      );

      if (result.changes === 0) {
        return false;
      }

      for (const timelineEntry of timelineEntries) {
        insertTimeline.run(
          timelineEntry.id,
          timelineEntry.reminderId,
          timelineEntry.actorRole,
          timelineEntry.eventType,
          timelineEntry.fromValue ? JSON.stringify(timelineEntry.fromValue) : null,
          timelineEntry.toValue ? JSON.stringify(timelineEntry.toValue) : null,
          timelineEntry.metadata ? JSON.stringify(timelineEntry.metadata) : null,
          timelineEntry.createdAt
        );
      }

      return true;
    })();
  }

  getReminderNotificationPreferences(
    actorRole: ReminderNotificationPreferences['actorRole']
  ): ReminderNotificationPreferences {
    const row = this.db
      .prepare('SELECT * FROM reminder_notification_preferences WHERE actor_role = ?')
      .get(actorRole) as Record<string, unknown> | undefined;

    return mapReminderPreferencesRow(actorRole, row);
  }

  saveReminderNotificationPreferences(
    actorRole: ReminderNotificationPreferences['actorRole'],
    preferences: Omit<ReminderNotificationPreferences, 'actorRole' | 'updatedAt'>
  ): ReminderNotificationPreferences {
    const saved = reminderNotificationPreferencesSchema.parse({
      actorRole,
      ...preferences,
      updatedAt: new Date().toISOString()
    });

    this.db
      .prepare(`
        INSERT INTO reminder_notification_preferences (
          actor_role, enabled, due_reminders_enabled, daily_summary_enabled, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(actor_role) DO UPDATE SET
          enabled = excluded.enabled,
          due_reminders_enabled = excluded.due_reminders_enabled,
          daily_summary_enabled = excluded.daily_summary_enabled,
          updated_at = excluded.updated_at
      `)
      .run(
        saved.actorRole,
        saved.enabled ? 1 : 0,
        saved.dueRemindersEnabled ? 1 : 0,
        saved.dailySummaryEnabled ? 1 : 0,
        saved.updatedAt
      );

    return saved;
  }

  saveNotificationSubscription(actorRole: NotificationSubscription['actorRole'], endpoint: string, payload: Record<string, unknown>): NotificationSubscription {
    const subscription = notificationSubscriptionSchema.parse({
      id: randomUUID(),
      actorRole,
      endpoint,
      payload,
      createdAt: new Date().toISOString()
    });

    this.db
      .prepare(`
        INSERT INTO notification_subscriptions (id, actor_role, endpoint, payload, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET
          id = excluded.id,
          actor_role = excluded.actor_role,
          payload = excluded.payload,
          created_at = excluded.created_at
      `)
      .run(subscription.id, subscription.actorRole, subscription.endpoint, JSON.stringify(subscription.payload), subscription.createdAt);

    return subscription;
  }

  listNotificationSubscriptions(actorRole: NotificationSubscription['actorRole']): NotificationSubscription[] {
    const rows = this.db
      .prepare('SELECT * FROM notification_subscriptions WHERE actor_role = ? ORDER BY created_at DESC')
      .all(actorRole) as Record<string, unknown>[];

    return rows.map((row) =>
      notificationSubscriptionSchema.parse({
        id: row.id,
        actorRole: row.actor_role,
        endpoint: row.endpoint,
        payload: parseJsonColumn(row.payload),
        createdAt: row.created_at
      })
    );
  }

  hasNotificationDelivery(
    notificationType: NotificationDeliveryRecord['notificationType'],
    actorRole: ActorRole,
    deliveryBucket: string
  ): boolean {
    const row = this.db
      .prepare(
        'SELECT 1 FROM notification_delivery_log WHERE notification_type = ? AND actor_role = ? AND delivery_bucket = ? LIMIT 1'
      )
      .get(notificationType, actorRole, deliveryBucket) as { 1: number } | undefined;

    return Boolean(row);
  }

  recordNotificationDelivery(
    notificationType: NotificationDeliveryRecord['notificationType'],
    actorRole: ActorRole,
    reminderId: string | null,
    deliveryBucket: string,
    deliveredAt: string = new Date().toISOString()
  ): NotificationDeliveryRecord {
    const record: NotificationDeliveryRecord = {
      id: randomUUID(),
      notificationType,
      actorRole,
      reminderId,
      deliveryBucket,
      deliveredAt
    };

    this.db
      .prepare(`
        INSERT INTO notification_delivery_log (
          id, notification_type, actor_role, reminder_id, delivery_bucket, delivered_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        record.id,
        record.notificationType,
        record.actorRole,
        record.reminderId,
        record.deliveryBucket,
        record.deliveredAt
      );

    return record;
  }

  listNotificationDeliveries(
    actorRole: ActorRole,
    notificationType?: NotificationDeliveryRecord['notificationType']
  ): NotificationDeliveryRecord[] {
    const rows = notificationType
      ? (this.db
          .prepare(
            'SELECT * FROM notification_delivery_log WHERE actor_role = ? AND notification_type = ? ORDER BY delivered_at DESC'
          )
          .all(actorRole, notificationType) as Record<string, unknown>[])
      : (this.db
          .prepare('SELECT * FROM notification_delivery_log WHERE actor_role = ? ORDER BY delivered_at DESC')
          .all(actorRole) as Record<string, unknown>[]);

    return rows.map((row) => ({
      id: String(row.id),
      notificationType: row.notification_type as NotificationDeliveryRecord['notificationType'],
      actorRole: row.actor_role as ActorRole,
      reminderId: row.reminder_id ? String(row.reminder_id) : null,
      deliveryBucket: String(row.delivery_bucket),
      deliveredAt: String(row.delivered_at)
    }));
  }

  exportSnapshot(): {
    items: InboxItem[];
    history: HistoryEntry[];
    reminders: Reminder[];
    reminderTimeline: ReminderTimelineEntry[];
    reminderPreferences: ReminderNotificationPreferences[];
    notificationDeliveries: NotificationDeliveryRecord[];
  } {
    const historyRows = this.db.prepare('SELECT * FROM inbox_item_history ORDER BY created_at DESC').all() as Record<string, unknown>[];
    const reminderTimelineRows = this.db
      .prepare('SELECT * FROM reminder_timeline ORDER BY created_at DESC, id DESC')
      .all() as Record<string, unknown>[];
    const reminderPreferenceRows = this.db
      .prepare('SELECT * FROM reminder_notification_preferences ORDER BY actor_role ASC')
      .all() as Record<string, unknown>[];
    return {
      items: this.listItems(),
      history: historyRows.map(mapHistoryRow),
      reminders: this.listReminders(),
      reminderTimeline: reminderTimelineRows.map(mapReminderTimelineRow),
      reminderPreferences: reminderPreferenceRows.map((row) =>
        mapReminderPreferencesRow(row.actor_role as ReminderNotificationPreferences['actorRole'], row)
      ),
      notificationDeliveries: this.listNotificationDeliveries('stakeholder')
    };
  }
}
