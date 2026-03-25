import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { computeReminderState, isMealPlanStale, computeLastActivityDescription, generateFreshnessNudgeCopy } from '@olivia/domain';
import {
  historyEntrySchema,
  inboxItemSchema,
  listItemHistoryEntrySchema,
  listItemSchema,
  mealEntrySchema,
  mealPlanSchema,
  notificationSubscriptionSchema,
  reminderNotificationPreferencesSchema,
  reminderSchema,
  reminderTimelineEntrySchema,
  reviewRecordSchema,
  routineOccurrenceSchema,
  routineSchema,
  sharedListSchema,
  NUDGE_APPROACHING_THRESHOLD_HOURS,
  type GeneratedListRef,
  type HistoryEntry,
  type InboxItem,
  type ListItem,
  type ListItemHistoryEntry,
  type MealEntry,
  type MealPlan,
  type NotificationSubscription,
  type Nudge,
  type Reminder,
  type ReminderNotificationPreferences,
  type ReminderTimelineEntry,
  type ReviewRecord,
  type Routine,
  type RoutineOccurrence,
  type RoutineStatus,
  type SharedList,
  type StaleItem,
  type StaleItemEntityType,
  type ArchivableEntityType,
  type HealthCheckState
} from '@olivia/contracts';

const DEFAULT_REMINDER_PREFERENCES_UPDATED_AT = new Date(0).toISOString();

const REMINDER_SELECT = `
  SELECT
    reminders.*,
    inbox_items.id AS linked_item_id,
    inbox_items.title AS linked_item_title,
    inbox_items.status AS linked_item_status,
    inbox_items.assignee_user_id AS linked_item_assignee_user_id,
    inbox_items.due_at AS linked_item_due_at
  FROM reminders
  LEFT JOIN inbox_items ON inbox_items.id = reminders.linked_inbox_item_id
`;

export type NotificationDeliveryRecord = {
  id: string;
  notificationType: 'due_reminder' | 'daily_summary';
  userId: string;
  reminderId: string | null;
  deliveryBucket: string;
  deliveredAt: string;
};

export type PushSubscriptionRecord = {
  id: string;
  household_id: string;
  endpoint: string;
  p256dh_key: string;
  auth_key: string;
  user_id: string | null;
  created_at: string;
  updated_at: string;
};

const parseJsonColumn = (value: unknown): unknown => (value ? JSON.parse(String(value)) : null);

const mapItemRow = (row: Record<string, unknown>): InboxItem =>
  inboxItemSchema.parse({
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    assigneeUserId: row.assignee_user_id ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    status: row.status,
    dueAt: row.due_at ?? null,
    dueText: row.due_text ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version,
    lastStatusChangedAt: row.last_status_changed_at,
    lastNoteAt: row.last_note_at ?? null,
    archivedAt: row.archived_at ?? null,
    freshnessCheckedAt: row.freshness_checked_at ?? null
  });

const mapHistoryRow = (row: Record<string, unknown>): HistoryEntry =>
  historyEntrySchema.parse({
    id: row.id,
    itemId: row.item_id,
    userId: row.user_id ?? null,
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
    assigneeUserId: row.assignee_user_id ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    scheduledAt: String(row.scheduled_at),
    recurrenceCadence: row.recurrence_cadence,
    linkedInboxItemId: row.linked_inbox_item_id ? String(row.linked_inbox_item_id) : null,
    linkedInboxItem: row.linked_item_id
      ? {
          id: String(row.linked_item_id),
          title: String(row.linked_item_title),
          status: row.linked_item_status,
          assigneeUserId: row.linked_item_assignee_user_id ?? null,
          dueAt: row.linked_item_due_at ? String(row.linked_item_due_at) : null
        }
      : null,
    snoozedUntil: row.snoozed_until ? String(row.snoozed_until) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    cancelledAt: row.cancelled_at ? String(row.cancelled_at) : null,
    freshnessCheckedAt: row.freshness_checked_at ? String(row.freshness_checked_at) : null,
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
    userId: row.user_id ?? null,
    eventType: row.event_type,
    fromValue: parseJsonColumn(row.from_value),
    toValue: parseJsonColumn(row.to_value),
    metadata: parseJsonColumn(row.metadata),
    createdAt: row.created_at
  });

const mapReminderPreferencesRow = (
  userId: string,
  row?: Record<string, unknown>
): ReminderNotificationPreferences =>
  reminderNotificationPreferencesSchema.parse({
    userId,
    enabled: row ? Boolean(row.enabled) : false,
    dueRemindersEnabled: row ? Boolean(row.due_reminders_enabled) : false,
    dailySummaryEnabled: row ? Boolean(row.daily_summary_enabled) : false,
    updatedAt: row?.updated_at ?? DEFAULT_REMINDER_PREFERENCES_UPDATED_AT
  });

const mapSharedListRow = (row: Record<string, unknown>): SharedList =>
  sharedListSchema.parse({
    id: row.id,
    title: row.title,
    assigneeUserId: row.assignee_user_id ?? null,
    createdByUserId: row.created_by_user_id ?? null,
    status: row.status,
    // Summary counts are computed separately and not stored on the row; default to 0
    activeItemCount: 0,
    checkedItemCount: 0,
    allChecked: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
    freshnessCheckedAt: row.freshness_checked_at ?? null,
    version: row.version
  });

const mapListItemRow = (row: Record<string, unknown>): ListItem =>
  listItemSchema.parse({
    id: row.id,
    listId: row.list_id,
    body: row.body,
    checked: Boolean(row.checked),
    checkedAt: row.checked_at ?? null,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    version: row.version
  });

const mapListItemHistoryRow = (row: Record<string, unknown>): ListItemHistoryEntry =>
  listItemHistoryEntrySchema.parse({
    id: row.id,
    listId: row.list_id,
    itemId: row.item_id ?? null,
    userId: row.user_id ?? null,
    eventType: row.event_type,
    fromValue: parseJsonColumn(row.from_value),
    toValue: parseJsonColumn(row.to_value),
    createdAt: row.created_at
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
        id, title, description, assignee_user_id, created_by_user_id, status, due_at, due_text, created_at, updated_at, version, last_status_changed_at, last_note_at, archived_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO inbox_item_history (id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      insertItem.run(
        item.id,
        item.title,
        item.description,
        item.assigneeUserId,
        item.createdByUserId ?? null,
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
        historyEntry.userId ?? null,
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
      SET title = ?, description = ?, assignee_user_id = ?, status = ?, due_at = ?, due_text = ?, updated_at = ?, version = ?, last_status_changed_at = ?, last_note_at = ?, archived_at = ?
      WHERE id = ? AND version = ?
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO inbox_item_history (id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    const transaction = this.db.transaction(() => {
      const result = updateItem.run(
        item.title,
        item.description,
        item.assigneeUserId,
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
        historyEntry.userId ?? null,
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
        id, title, note, assignee_user_id, created_by_user_id, linked_inbox_item_id, recurrence_cadence, scheduled_at, snoozed_until,
        completed_at, cancelled_at, created_at, updated_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertTimeline = this.db.prepare(`
      INSERT INTO reminder_timeline (id, reminder_id, user_id, event_type, from_value, to_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      insertReminder.run(
        reminder.id,
        reminder.title,
        reminder.note,
        reminder.assigneeUserId,
        reminder.createdByUserId ?? null,
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
          timelineEntry.userId ?? null,
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
      INSERT OR IGNORE INTO reminder_timeline (id, reminder_id, user_id, event_type, from_value, to_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      for (const timelineEntry of timelineEntries) {
        insertTimeline.run(
          timelineEntry.id,
          timelineEntry.reminderId,
          timelineEntry.userId ?? null,
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
      SET title = ?, note = ?, assignee_user_id = ?, linked_inbox_item_id = ?, recurrence_cadence = ?, scheduled_at = ?,
          snoozed_until = ?, completed_at = ?, cancelled_at = ?, updated_at = ?, version = ?
      WHERE id = ? AND version = ?
    `);
    const insertTimeline = this.db.prepare(`
      INSERT INTO reminder_timeline (id, reminder_id, user_id, event_type, from_value, to_value, metadata, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return this.db.transaction(() => {
      const result = updateReminder.run(
        reminder.title,
        reminder.note,
        reminder.assigneeUserId,
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
          timelineEntry.userId ?? null,
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
    userId: string
  ): ReminderNotificationPreferences {
    const row = this.db
      .prepare('SELECT * FROM reminder_notification_preferences WHERE user_id = ?')
      .get(userId) as Record<string, unknown> | undefined;

    return mapReminderPreferencesRow(userId, row);
  }

  saveReminderNotificationPreferences(
    userId: string,
    preferences: Omit<ReminderNotificationPreferences, 'userId' | 'updatedAt'>
  ): ReminderNotificationPreferences {
    const saved = reminderNotificationPreferencesSchema.parse({
      userId,
      ...preferences,
      updatedAt: new Date().toISOString()
    });

    this.db
      .prepare(`
        INSERT INTO reminder_notification_preferences (
          user_id, enabled, due_reminders_enabled, daily_summary_enabled, updated_at
        ) VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(user_id) DO UPDATE SET
          enabled = excluded.enabled,
          due_reminders_enabled = excluded.due_reminders_enabled,
          daily_summary_enabled = excluded.daily_summary_enabled,
          updated_at = excluded.updated_at
      `)
      .run(
        saved.userId,
        saved.enabled ? 1 : 0,
        saved.dueRemindersEnabled ? 1 : 0,
        saved.dailySummaryEnabled ? 1 : 0,
        saved.updatedAt
      );

    return saved;
  }

  saveNotificationSubscription(userId: string, endpoint: string, payload: Record<string, unknown>): NotificationSubscription {
    const subscription = notificationSubscriptionSchema.parse({
      id: randomUUID(),
      userId,
      endpoint,
      payload,
      createdAt: new Date().toISOString()
    });

    this.db
      .prepare(`
        INSERT INTO notification_subscriptions (id, user_id, endpoint, payload, created_at)
        VALUES (?, ?, ?, ?, ?)
        ON CONFLICT(endpoint) DO UPDATE SET
          id = excluded.id,
          user_id = excluded.user_id,
          payload = excluded.payload,
          created_at = excluded.created_at
      `)
      .run(subscription.id, subscription.userId, subscription.endpoint, JSON.stringify(subscription.payload), subscription.createdAt);

    return subscription;
  }

  listNotificationSubscriptions(userId: string): NotificationSubscription[] {
    const rows = this.db
      .prepare('SELECT * FROM notification_subscriptions WHERE user_id = ? ORDER BY created_at DESC')
      .all(userId) as Record<string, unknown>[];

    return rows.map((row) =>
      notificationSubscriptionSchema.parse({
        id: row.id,
        userId: row.user_id,
        endpoint: row.endpoint,
        payload: parseJsonColumn(row.payload),
        createdAt: row.created_at
      })
    );
  }

  listAllReminderNotificationPreferences(): ReminderNotificationPreferences[] {
    const rows = this.db
      .prepare('SELECT * FROM reminder_notification_preferences ORDER BY user_id ASC')
      .all() as Record<string, unknown>[];

    return rows.map((row) => mapReminderPreferencesRow(String(row.user_id), row));
  }

  listAllNotificationSubscriptions(): NotificationSubscription[] {
    const rows = this.db
      .prepare('SELECT * FROM notification_subscriptions ORDER BY created_at DESC')
      .all() as Record<string, unknown>[];

    return rows.map((row) =>
      notificationSubscriptionSchema.parse({
        id: row.id,
        userId: row.user_id,
        endpoint: row.endpoint,
        payload: parseJsonColumn(row.payload),
        createdAt: row.created_at
      })
    );
  }

  hasNotificationDelivery(
    notificationType: NotificationDeliveryRecord['notificationType'],
    userId: string,
    deliveryBucket: string
  ): boolean {
    const row = this.db
      .prepare(
        'SELECT 1 FROM notification_delivery_log WHERE notification_type = ? AND user_id = ? AND delivery_bucket = ? LIMIT 1'
      )
      .get(notificationType, userId, deliveryBucket) as { 1: number } | undefined;

    return Boolean(row);
  }

  recordNotificationDelivery(
    notificationType: NotificationDeliveryRecord['notificationType'],
    userId: string,
    reminderId: string | null,
    deliveryBucket: string,
    deliveredAt: string = new Date().toISOString()
  ): NotificationDeliveryRecord {
    const record: NotificationDeliveryRecord = {
      id: randomUUID(),
      notificationType,
      userId,
      reminderId,
      deliveryBucket,
      deliveredAt
    };

    this.db
      .prepare(`
        INSERT INTO notification_delivery_log (
          id, notification_type, user_id, reminder_id, delivery_bucket, delivered_at
        ) VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(
        record.id,
        record.notificationType,
        record.userId,
        record.reminderId,
        record.deliveryBucket,
        record.deliveredAt
      );

    return record;
  }

  listNotificationDeliveries(
    userId: string,
    notificationType?: NotificationDeliveryRecord['notificationType']
  ): NotificationDeliveryRecord[] {
    const rows = notificationType
      ? (this.db
          .prepare(
            'SELECT * FROM notification_delivery_log WHERE user_id = ? AND notification_type = ? ORDER BY delivered_at DESC'
          )
          .all(userId, notificationType) as Record<string, unknown>[])
      : (this.db
          .prepare('SELECT * FROM notification_delivery_log WHERE user_id = ? ORDER BY delivered_at DESC')
          .all(userId) as Record<string, unknown>[]);

    return rows.map((row) => ({
      id: String(row.id),
      notificationType: row.notification_type as NotificationDeliveryRecord['notificationType'],
      userId: String(row.user_id),
      reminderId: row.reminder_id ? String(row.reminder_id) : null,
      deliveryBucket: String(row.delivery_bucket),
      deliveredAt: String(row.delivered_at)
    }));
  }

  // ─── Shared List repository ───────────────────────────────────────────────

  listSharedLists(status: 'active' | 'archived' = 'active'): SharedList[] {
    const rows = this.db
      .prepare('SELECT * FROM shared_lists WHERE status = ? ORDER BY updated_at DESC')
      .all(status) as Record<string, unknown>[];
    return rows.map(mapSharedListRow);
  }

  getSharedList(listId: string): SharedList | null {
    const row = this.db
      .prepare('SELECT * FROM shared_lists WHERE id = ?')
      .get(listId) as Record<string, unknown> | undefined;
    return row ? mapSharedListRow(row) : null;
  }

  getListItems(listId: string): ListItem[] {
    const rows = this.db
      .prepare('SELECT * FROM list_items WHERE list_id = ? ORDER BY position ASC, created_at ASC')
      .all(listId) as Record<string, unknown>[];
    return rows.map(mapListItemRow);
  }

  getListItemHistory(listId: string): ListItemHistoryEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM list_item_history WHERE list_id = ? ORDER BY created_at DESC')
      .all(listId) as Record<string, unknown>[];
    return rows.map(mapListItemHistoryRow);
  }

  createSharedList(list: SharedList, historyEntry: ListItemHistoryEntry): void {
    const insertList = this.db.prepare(`
      INSERT INTO shared_lists (id, title, assignee_user_id, created_by_user_id, status, created_at, updated_at, archived_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      insertList.run(
        list.id, list.title, list.assigneeUserId, list.createdByUserId ?? null, list.status,
        list.createdAt, list.updatedAt, list.archivedAt, list.version
      );
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
    })();
  }

  updateSharedList(list: SharedList, historyEntry: ListItemHistoryEntry, expectedVersion: number): boolean {
    const updateList = this.db.prepare(`
      UPDATE shared_lists
      SET title = ?, status = ?, updated_at = ?, archived_at = ?, version = ?
      WHERE id = ? AND version = ?
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return this.db.transaction(() => {
      const result = updateList.run(
        list.title, list.status, list.updatedAt, list.archivedAt, list.version,
        list.id, expectedVersion
      );
      if (result.changes === 0) {
        return false;
      }
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
      return true;
    })();
  }

  deleteSharedList(listId: string): void {
    // Foreign key cascade deletes list_items and list_item_history
    this.db.prepare('DELETE FROM shared_lists WHERE id = ?').run(listId);
  }

  addListItem(item: ListItem, historyEntry: ListItemHistoryEntry): void {
    const insertItem = this.db.prepare(`
      INSERT INTO list_items (id, list_id, body, checked, checked_at, position, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      insertItem.run(
        item.id, item.listId, item.body, item.checked ? 1 : 0, item.checkedAt,
        item.position, item.createdAt, item.updatedAt, item.version
      );
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
    })();
  }

  updateListItem(item: ListItem, historyEntry: ListItemHistoryEntry, expectedVersion: number): boolean {
    const updateItem = this.db.prepare(`
      UPDATE list_items
      SET body = ?, checked = ?, checked_at = ?, updated_at = ?, version = ?
      WHERE id = ? AND version = ?
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return this.db.transaction(() => {
      const result = updateItem.run(
        item.body, item.checked ? 1 : 0, item.checkedAt, item.updatedAt, item.version,
        item.id, expectedVersion
      );
      if (result.changes === 0) {
        return false;
      }
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
      return true;
    })();
  }

  removeListItem(itemId: string, listId: string, historyEntry: ListItemHistoryEntry): void {
    const deleteItem = this.db.prepare('DELETE FROM list_items WHERE id = ? AND list_id = ?');
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      deleteItem.run(itemId, listId);
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
    })();
  }

  clearCompletedItems(listId: string, historyEntry: ListItemHistoryEntry): number {
    const deleteChecked = this.db.prepare('DELETE FROM list_items WHERE list_id = ? AND checked = 1');
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return this.db.transaction(() => {
      const result = deleteChecked.run(listId);
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
      return result.changes;
    })();
  }

  uncheckAllItems(listId: string, historyEntry: ListItemHistoryEntry): number {
    const now = new Date().toISOString();
    const uncheckAll = this.db.prepare(
      'UPDATE list_items SET checked = 0, checked_at = NULL, updated_at = ?, version = version + 1 WHERE list_id = ? AND checked = 1'
    );
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    return this.db.transaction(() => {
      const result = uncheckAll.run(now, listId);
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.userId ?? null, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
      return result.changes;
    })();
  }

  getNextListItemPosition(listId: string): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS next_position FROM list_items WHERE list_id = ?')
      .get(listId) as { next_position: number };
    return row.next_position;
  }

  // ─── Routine repository ───────────────────────────────────────────────────

  private mapRoutineRow(row: Record<string, unknown>): Routine {
    const weekdaysRaw = row.weekdays;
    let weekdays: number[] | null = null;
    if (typeof weekdaysRaw === 'string' && weekdaysRaw) {
      try { weekdays = JSON.parse(weekdaysRaw); } catch { weekdays = null; }
    }
    const base = routineSchema.parse({
      id: row.id,
      title: row.title,
      assigneeUserId: row.assignee_user_id ?? null,
      createdByUserId: row.created_by_user_id ?? null,
      recurrenceRule: row.recurrence_rule,
      intervalDays: row.interval_days ?? null,
      intervalWeeks: row.interval_weeks ?? null,
      weekdays,
      status: row.status,
      currentDueDate: row.current_due_date ?? null,
      ritualType: row.ritual_type ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at ?? null,
      freshnessCheckedAt: row.freshness_checked_at ?? null,
      version: row.version
    });
    return base;
  }

  private mapRoutineOccurrenceRow(row: Record<string, unknown>): RoutineOccurrence {
    return routineOccurrenceSchema.parse({
      id: row.id,
      routineId: row.routine_id,
      dueDate: row.due_date,
      completedAt: row.completed_at ?? null,
      completedByUserId: row.completed_by_user_id ?? null,
      skipped: Boolean(row.skipped),
      reviewRecordId: row.review_record_id ?? null,
      createdAt: row.created_at
    });
  }

  listRoutines(status: RoutineStatus = 'active'): Routine[] {
    const rows = this.db
      .prepare('SELECT * FROM routines WHERE status = ? ORDER BY current_due_date ASC, updated_at DESC')
      .all(status) as Record<string, unknown>[];
    return rows.map((row) => this.mapRoutineRow(row));
  }

  listActiveAndPausedRoutines(): Routine[] {
    const rows = this.db
      .prepare("SELECT * FROM routines WHERE status IN ('active', 'paused') ORDER BY current_due_date ASC, updated_at DESC")
      .all() as Record<string, unknown>[];
    return rows.map((row) => this.mapRoutineRow(row));
  }

  getRoutine(routineId: string): Routine | null {
    const row = this.db
      .prepare('SELECT * FROM routines WHERE id = ?')
      .get(routineId) as Record<string, unknown> | undefined;
    return row ? this.mapRoutineRow(row) : null;
  }

  getRoutineOccurrences(routineId: string, limit?: number): RoutineOccurrence[] {
    const sql = limit
      ? 'SELECT * FROM routine_occurrences WHERE routine_id = ? ORDER BY due_date DESC LIMIT ?'
      : 'SELECT * FROM routine_occurrences WHERE routine_id = ? ORDER BY due_date DESC';
    const rows = (limit
      ? this.db.prepare(sql).all(routineId, limit)
      : this.db.prepare(sql).all(routineId)) as Record<string, unknown>[];
    return rows.map((row) => this.mapRoutineOccurrenceRow(row));
  }

  getRoutineOccurrenceForDueDate(routineId: string, dueDate: string): RoutineOccurrence | null {
    const row = this.db
      .prepare('SELECT * FROM routine_occurrences WHERE routine_id = ? AND due_date = ?')
      .get(routineId, dueDate) as Record<string, unknown> | undefined;
    return row ? this.mapRoutineOccurrenceRow(row) : null;
  }

  createRoutine(routine: Routine): void {
    this.db.prepare(`
      INSERT INTO routines (
        id, title, assignee_user_id, created_by_user_id, recurrence_rule, interval_days, interval_weeks, weekdays, status, current_due_date,
        ritual_type, created_at, updated_at, archived_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      routine.id, routine.title, routine.assigneeUserId, routine.createdByUserId ?? null, routine.recurrenceRule, routine.intervalDays,
      routine.intervalWeeks, routine.weekdays ? JSON.stringify(routine.weekdays) : null,
      routine.status, routine.currentDueDate, routine.ritualType ?? null,
      routine.createdAt, routine.updatedAt, routine.archivedAt, routine.version
    );
  }

  updateRoutine(routine: Routine, expectedVersion: number): boolean {
    const result = this.db.prepare(`
      UPDATE routines
      SET title = ?, assignee_user_id = ?, recurrence_rule = ?, interval_days = ?, interval_weeks = ?, weekdays = ?, status = ?,
          current_due_date = ?, ritual_type = ?, updated_at = ?, archived_at = ?, version = ?
      WHERE id = ? AND version = ?
    `).run(
      routine.title, routine.assigneeUserId, routine.recurrenceRule, routine.intervalDays,
      routine.intervalWeeks, routine.weekdays ? JSON.stringify(routine.weekdays) : null,
      routine.status, routine.currentDueDate, routine.ritualType ?? null,
      routine.updatedAt, routine.archivedAt, routine.version,
      routine.id, expectedVersion
    );
    return result.changes > 0;
  }

  getLastCompletedAt(routineId: string): string | null {
    const row = this.db
      .prepare('SELECT completed_at FROM routine_occurrences WHERE routine_id = ? AND completed_at IS NOT NULL AND skipped = 0 ORDER BY completed_at DESC LIMIT 1')
      .get(routineId) as { completed_at: string } | undefined;
    return row?.completed_at ?? null;
  }

  getLastCompletedAtBulk(routineIds: string[]): Map<string, string> {
    if (routineIds.length === 0) return new Map();
    const placeholders = routineIds.map(() => '?').join(',');
    const rows = this.db
      .prepare(`SELECT routine_id, MAX(completed_at) as last_completed_at FROM routine_occurrences WHERE routine_id IN (${placeholders}) AND completed_at IS NOT NULL AND skipped = 0 GROUP BY routine_id`)
      .all(...routineIds) as Array<{ routine_id: string; last_completed_at: string }>;
    const map = new Map<string, string>();
    for (const row of rows) {
      map.set(row.routine_id, row.last_completed_at);
    }
    return map;
  }

  deleteRoutine(routineId: string): void {
    // Foreign key cascade deletes routine_occurrences
    this.db.prepare('DELETE FROM routines WHERE id = ?').run(routineId);
  }

  /**
   * Atomically inserts an occurrence row and advances the routine's currentDueDate.
   * Returns false if the version check fails (stale update).
   */
  completeRoutineOccurrence(
    updatedRoutine: Routine,
    occurrence: RoutineOccurrence,
    expectedVersion: number
  ): boolean {
    const insertOccurrence = this.db.prepare(`
      INSERT INTO routine_occurrences (id, routine_id, due_date, completed_at, completed_by_user_id, skipped, review_record_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const updateRoutine = this.db.prepare(`
      UPDATE routines
      SET current_due_date = ?, updated_at = ?, version = ?
      WHERE id = ? AND version = ?
    `);

    return this.db.transaction(() => {
      const result = updateRoutine.run(
        updatedRoutine.currentDueDate,
        updatedRoutine.updatedAt,
        updatedRoutine.version,
        updatedRoutine.id,
        expectedVersion
      );
      if (result.changes === 0) {
        return false;
      }
      insertOccurrence.run(
        occurrence.id,
        occurrence.routineId,
        occurrence.dueDate,
        occurrence.completedAt,
        occurrence.completedByUserId ?? null,
        occurrence.skipped ? 1 : 0,
        occurrence.reviewRecordId ?? null,
        occurrence.createdAt
      );
      return true;
    })();
  }

  // ─── Meal Plan repository ─────────────────────────────────────────────────

  private mapMealPlanRow(row: Record<string, unknown>): MealPlan {
    return mealPlanSchema.parse({
      id: row.id,
      title: row.title,
      weekStartDate: row.week_start_date,
      status: row.status,
      generatedListRefs: JSON.parse(String(row.generated_list_refs || '[]')),
      mealCount: 0,
      shoppingItemCount: 0,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at ?? null,
      freshnessCheckedAt: row.freshness_checked_at ?? null,
      version: row.version
    });
  }

  private mapMealEntryRow(row: Record<string, unknown>): MealEntry {
    return mealEntrySchema.parse({
      id: row.id,
      planId: row.plan_id,
      dayOfWeek: row.day_of_week,
      name: row.name,
      shoppingItems: JSON.parse(String(row.shopping_items || '[]')),
      position: row.position,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version
    });
  }

  listMealPlans(status: 'active' | 'archived' = 'active'): MealPlan[] {
    const rows = this.db
      .prepare('SELECT * FROM meal_plans WHERE status = ? ORDER BY updated_at DESC')
      .all(status) as Record<string, unknown>[];
    return rows.map((row) => {
      const plan = this.mapMealPlanRow(row);
      const entries = this.getMealEntries(plan.id);
      const mealCount = entries.length;
      const shoppingItemCount = entries.reduce((sum, e) => sum + e.shoppingItems.length, 0);
      return { ...plan, mealCount, shoppingItemCount };
    });
  }

  getMealPlan(planId: string): MealPlan | null {
    const row = this.db
      .prepare('SELECT * FROM meal_plans WHERE id = ?')
      .get(planId) as Record<string, unknown> | undefined;
    if (!row) return null;
    const plan = this.mapMealPlanRow(row);
    const entries = this.getMealEntries(planId);
    const mealCount = entries.length;
    const shoppingItemCount = entries.reduce((sum, e) => sum + e.shoppingItems.length, 0);
    return { ...plan, mealCount, shoppingItemCount };
  }

  getMealEntries(planId: string): MealEntry[] {
    const rows = this.db
      .prepare('SELECT * FROM meal_entries WHERE plan_id = ? ORDER BY day_of_week ASC, position ASC')
      .all(planId) as Record<string, unknown>[];
    return rows.map((row) => this.mapMealEntryRow(row));
  }

  getNextMealEntryPosition(planId: string, dayOfWeek: number): number {
    const row = this.db
      .prepare('SELECT COALESCE(MAX(position) + 1, 0) AS next_position FROM meal_entries WHERE plan_id = ? AND day_of_week = ?')
      .get(planId, dayOfWeek) as { next_position: number };
    return row.next_position;
  }

  createMealPlan(plan: MealPlan): void {
    this.db.prepare(`
      INSERT INTO meal_plans (id, title, week_start_date, status, generated_list_refs, created_at, updated_at, archived_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      plan.id, plan.title, plan.weekStartDate, plan.status,
      JSON.stringify(plan.generatedListRefs),
      plan.createdAt, plan.updatedAt, plan.archivedAt, plan.version
    );
  }

  updateMealPlan(id: string, changes: Partial<Pick<MealPlan, 'title' | 'status' | 'archivedAt' | 'updatedAt' | 'version' | 'generatedListRefs'>>, expectedVersion: number): boolean {
    const current = this.db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!current) return false;
    if (Number(current.version) !== expectedVersion) {
      throw new Error(`Version conflict: expected version ${expectedVersion} but found ${current.version}.`);
    }
    const merged = {
      title: changes.title ?? String(current.title),
      status: changes.status ?? String(current.status),
      archivedAt: 'archivedAt' in changes ? (changes.archivedAt ?? null) : (current.archived_at ? String(current.archived_at) : null),
      updatedAt: changes.updatedAt ?? new Date().toISOString(),
      version: changes.version ?? (Number(current.version) + 1),
      generatedListRefs: changes.generatedListRefs !== undefined ? JSON.stringify(changes.generatedListRefs) : String(current.generated_list_refs)
    };
    const result = this.db.prepare(`
      UPDATE meal_plans
      SET title = ?, status = ?, archived_at = ?, updated_at = ?, version = ?, generated_list_refs = ?
      WHERE id = ? AND version = ?
    `).run(
      merged.title, merged.status, merged.archivedAt, merged.updatedAt, merged.version, merged.generatedListRefs,
      id, expectedVersion
    );
    return result.changes > 0;
  }

  deleteMealPlan(planId: string): void {
    this.db.prepare('DELETE FROM meal_plans WHERE id = ?').run(planId);
  }

  addMealEntry(entry: MealEntry): void {
    this.db.prepare(`
      INSERT INTO meal_entries (id, plan_id, day_of_week, name, shopping_items, position, created_at, updated_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      entry.id, entry.planId, entry.dayOfWeek, entry.name,
      JSON.stringify(entry.shoppingItems),
      entry.position, entry.createdAt, entry.updatedAt, entry.version
    );
  }

  updateMealEntry(id: string, changes: Partial<Pick<MealEntry, 'name' | 'shoppingItems' | 'updatedAt' | 'version'>>, expectedVersion: number): boolean {
    const current = this.db.prepare('SELECT * FROM meal_entries WHERE id = ?').get(id) as Record<string, unknown> | undefined;
    if (!current) return false;
    if (Number(current.version) !== expectedVersion) {
      throw new Error(`Version conflict: expected version ${expectedVersion} but found ${current.version}.`);
    }
    const merged = {
      name: changes.name ?? String(current.name),
      shoppingItems: changes.shoppingItems !== undefined ? JSON.stringify(changes.shoppingItems) : String(current.shopping_items),
      updatedAt: changes.updatedAt ?? new Date().toISOString(),
      version: changes.version ?? (Number(current.version) + 1)
    };
    const result = this.db.prepare(`
      UPDATE meal_entries
      SET name = ?, shopping_items = ?, updated_at = ?, version = ?
      WHERE id = ? AND version = ?
    `).run(
      merged.name, merged.shoppingItems, merged.updatedAt, merged.version,
      id, expectedVersion
    );
    return result.changes > 0;
  }

  deleteMealEntry(entryId: string): void {
    this.db.prepare('DELETE FROM meal_entries WHERE id = ?').run(entryId);
  }

  addGeneratedListRef(planId: string, ref: GeneratedListRef, expectedVersion: number): boolean {
    const current = this.db.prepare('SELECT * FROM meal_plans WHERE id = ?').get(planId) as Record<string, unknown> | undefined;
    if (!current) return false;
    if (Number(current.version) !== expectedVersion) {
      throw new Error(`Version conflict: expected version ${expectedVersion} but found ${current.version}.`);
    }
    const existingRefs: GeneratedListRef[] = JSON.parse(String(current.generated_list_refs || '[]'));
    const newRefs = [...existingRefs, ref];
    const result = this.db.prepare(`
      UPDATE meal_plans
      SET generated_list_refs = ?, version = ?, updated_at = ?
      WHERE id = ? AND version = ?
    `).run(
      JSON.stringify(newRefs), Number(current.version) + 1, new Date().toISOString(),
      planId, expectedVersion
    );
    return result.changes > 0;
  }

  getWeeklyViewData(weekStart: Date, weekEnd: Date): {
    reminders: Reminder[];
    routines: Routine[];
    routineOccurrences: Map<string, RoutineOccurrence[]>;
    activeMealPlan: MealPlan | null;
    mealEntries: MealEntry[];
    inboxItems: InboxItem[];
  } {
    const weekStartIso = weekStart.toISOString();
    const weekEndIso = weekEnd.toISOString();

    // Reminders scheduled within the week window
    const reminderRows = this.db
      .prepare(`${REMINDER_SELECT} WHERE reminders.scheduled_at >= ? AND reminders.scheduled_at <= ? ORDER BY reminders.scheduled_at ASC`)
      .all(weekStartIso, weekEndIso) as Record<string, unknown>[];
    const reminders = reminderRows.map((row) => mapReminderRow(row, weekStart));

    // All active routines (projection happens in route handler)
    const routines = this.listActiveAndPausedRoutines();

    // Batch-fetch occurrences for all active routines (date range: 1 month before weekStart to weekEnd)
    // Using date-only prefix comparison to handle timezone-safe date matching
    const weekStartDate = weekStart.toISOString().split('T')[0];
    const weekEndDate = weekEnd.toISOString().split('T')[0];
    const occurrenceRows = routines.length > 0
      ? this.db
          .prepare(`SELECT * FROM routine_occurrences WHERE date(due_date) >= ? AND date(due_date) <= ? ORDER BY due_date DESC`)
          .all(weekStartDate, weekEndDate) as Record<string, unknown>[]
      : [];
    const routineOccurrences = new Map<string, RoutineOccurrence[]>();
    for (const row of occurrenceRows) {
      const occ = this.mapRoutineOccurrenceRow(row);
      const existing = routineOccurrences.get(occ.routineId) ?? [];
      existing.push(occ);
      routineOccurrences.set(occ.routineId, existing);
    }

    // Active meal plan whose week_start_date matches weekStart (date-only comparison)
    const mealPlanRow = this.db
      .prepare(`SELECT * FROM meal_plans WHERE status = 'active' AND week_start_date = ? LIMIT 1`)
      .get(weekStartDate) as Record<string, unknown> | undefined;
    const activeMealPlan = mealPlanRow ? this.mapMealPlanRow(mealPlanRow) : null;
    const mealEntries = activeMealPlan ? this.getMealEntries(activeMealPlan.id) : [];

    // Inbox items with dueAt within the week window
    const inboxRows = this.db
      .prepare(`SELECT * FROM inbox_items WHERE due_at >= ? AND due_at <= ? ORDER BY due_at ASC`)
      .all(weekStartIso, weekEndIso) as Record<string, unknown>[];
    const inboxItems = inboxRows.map(mapItemRow);

    return { reminders, routines, routineOccurrences, activeMealPlan, mealEntries, inboxItems };
  }

  getActivityHistoryData(windowStart: Date, windowEnd: Date): {
    completedRoutineOccurrences: Array<{ routineOccurrence: RoutineOccurrence; routine: Routine }>;
    resolvedReminders: Reminder[];
    pastMealEntries: Array<{ entry: MealEntry; plan: MealPlan }>;
    doneInboxItems: InboxItem[];
    checkedListItems: Array<{ item: ListItem; listName: string }>;
  } {
    const windowStartDate = windowStart.toISOString().split('T')[0];
    const windowEndDate = windowEnd.toISOString().split('T')[0];

    // Completed routine occurrences within the window (joined with non-archived routines)
    const routineOccurrenceRows = this.db.prepare(`
      SELECT ro.*, r.title AS routine_title, r.assignee_user_id AS routine_assignee_user_id,
             r.recurrence_rule, r.interval_days, r.status AS routine_status,
             r.current_due_date, r.created_at AS routine_created_at,
             r.updated_at AS routine_updated_at, r.archived_at AS routine_archived_at,
             r.version AS routine_version, r.ritual_type AS routine_ritual_type
      FROM routine_occurrences ro
      JOIN routines r ON ro.routine_id = r.id
      WHERE ro.completed_at IS NOT NULL
        AND r.status != 'archived'
        AND date(ro.due_date) >= ?
        AND date(ro.due_date) <= ?
      ORDER BY ro.completed_at DESC
    `).all(windowStartDate, windowEndDate) as Record<string, unknown>[];

    const completedRoutineOccurrences = routineOccurrenceRows.map((row) => {
      const routineOccurrence = this.mapRoutineOccurrenceRow(row);
      const routine = routineSchema.parse({
        id: row.routine_id,
        title: row.routine_title,
        assigneeUserId: row.routine_assignee_user_id ?? null,
        recurrenceRule: row.recurrence_rule,
        intervalDays: row.interval_days ?? null,
        status: row.routine_status,
        currentDueDate: row.current_due_date,
        ritualType: row.routine_ritual_type ?? null,
        createdAt: row.routine_created_at,
        updatedAt: row.routine_updated_at,
        archivedAt: row.routine_archived_at ?? null,
        version: row.routine_version
      });
      return { routineOccurrence, routine };
    });

    // Resolved reminders (completed or cancelled/dismissed) within the window
    const reminderRows = this.db.prepare(`
      SELECT * FROM reminders
      WHERE (
        (completed_at IS NOT NULL
          AND date(completed_at) >= ? AND date(completed_at) <= ?)
        OR
        (cancelled_at IS NOT NULL AND completed_at IS NULL
          AND date(cancelled_at) >= ? AND date(cancelled_at) <= ?)
      )
      ORDER BY COALESCE(completed_at, cancelled_at) DESC
    `).all(windowStartDate, windowEndDate, windowStartDate, windowEndDate) as Record<string, unknown>[];

    const resolvedReminders = reminderRows.map((row) => mapReminderRow(row));

    // Past meal plan entries: plans starting before current Monday whose entries fall in window
    // Add 7-day buffer to handle plans that started before window but have in-window entries
    const windowStartMinus7 = new Date(windowStart);
    windowStartMinus7.setDate(windowStartMinus7.getDate() - 7);
    const windowStartMinus7Date = windowStartMinus7.toISOString().split('T')[0];

    // Current Monday date string for "before current Monday" filter
    const currentDate = new Date();
    const dow = currentDate.getDay();
    const diffToMonday = dow === 0 ? -6 : 1 - dow;
    const currentMonday = new Date(currentDate);
    currentMonday.setDate(currentDate.getDate() + diffToMonday);
    currentMonday.setHours(0, 0, 0, 0);
    const currentMondayDate = currentMonday.toISOString().split('T')[0];

    const mealRows = this.db.prepare(`
      SELECT mp.id AS plan_id, mp.title AS plan_title, mp.week_start_date, mp.status AS plan_status,
             mp.generated_list_refs, mp.created_at AS plan_created_at,
             mp.updated_at AS plan_updated_at, mp.archived_at AS plan_archived_at,
             mp.version AS plan_version,
             me.id AS entry_id, me.day_of_week, me.name, me.shopping_items,
             me.position, me.created_at AS entry_created_at,
             me.updated_at AS entry_updated_at, me.version AS entry_version
      FROM meal_plans mp
      JOIN meal_entries me ON me.plan_id = mp.id
      WHERE mp.status != 'archived'
        AND mp.week_start_date < ?
        AND mp.week_start_date >= ?
      ORDER BY mp.week_start_date DESC, me.day_of_week ASC
    `).all(currentMondayDate, windowStartMinus7Date) as Record<string, unknown>[];

    const pastMealEntries: Array<{ entry: MealEntry; plan: MealPlan }> = [];
    for (const row of mealRows) {
      // Compute entry effective date
      const weekStart = row.week_start_date as string;
      const dayOfWeek = Number(row.day_of_week);
      const entryDate = new Date(weekStart + 'T00:00:00');
      entryDate.setDate(entryDate.getDate() + dayOfWeek);
      const entryDateStr = entryDate.toISOString().split('T')[0];

      // Filter to entries within the activity window
      if (entryDateStr < windowStartDate || entryDateStr > windowEndDate) continue;

      const plan = this.mapMealPlanRow({
        id: row.plan_id,
        title: row.plan_title,
        week_start_date: row.week_start_date,
        status: row.plan_status,
        generated_list_refs: row.generated_list_refs,
        created_at: row.plan_created_at,
        updated_at: row.plan_updated_at,
        archived_at: row.plan_archived_at ?? null,
        version: row.plan_version
      });
      const entry = this.mapMealEntryRow({
        id: row.entry_id,
        plan_id: row.plan_id,
        day_of_week: row.day_of_week,
        name: row.name,
        shopping_items: row.shopping_items,
        position: row.position,
        created_at: row.entry_created_at,
        updated_at: row.entry_updated_at,
        version: row.entry_version
      });
      pastMealEntries.push({ entry, plan });
    }

    // Done inbox items within the window (by lastStatusChangedAt)
    const inboxRows = this.db.prepare(`
      SELECT * FROM inbox_items
      WHERE status = 'done'
        AND date(last_status_changed_at) >= ?
        AND date(last_status_changed_at) <= ?
      ORDER BY last_status_changed_at DESC
    `).all(windowStartDate, windowEndDate) as Record<string, unknown>[];
    const doneInboxItems = inboxRows.map(mapItemRow);

    // Checked list items within the window (JOIN with shared_lists for list name)
    const listItemRows = this.db.prepare(`
      SELECT li.*, sl.title AS list_title
      FROM list_items li
      JOIN shared_lists sl ON li.list_id = sl.id
      WHERE li.checked = 1
        AND li.checked_at IS NOT NULL
        AND date(li.checked_at) >= ?
        AND date(li.checked_at) <= ?
      ORDER BY li.checked_at DESC
    `).all(windowStartDate, windowEndDate) as Record<string, unknown>[];
    const checkedListItems = listItemRows.map((row) => ({
      item: mapListItemRow(row),
      listName: String(row.list_title)
    }));

    return { completedRoutineOccurrences, resolvedReminders, pastMealEntries, doneInboxItems, checkedListItems };
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
      .prepare('SELECT * FROM reminder_notification_preferences ORDER BY user_id ASC')
      .all() as Record<string, unknown>[];
    return {
      items: this.listItems(),
      history: historyRows.map(mapHistoryRow),
      reminders: this.listReminders(),
      reminderTimeline: reminderTimelineRows.map(mapReminderTimelineRow),
      reminderPreferences: reminderPreferenceRows.map((row) =>
        mapReminderPreferencesRow(String(row.user_id), row)
      ),
      notificationDeliveries: []
    };
  }

  // ─── Review Record repository ──────────────────────────────────────────────

  private mapReviewRecordRow(row: Record<string, unknown>): ReviewRecord {
    return reviewRecordSchema.parse({
      id: row.id,
      ritualOccurrenceId: row.ritual_occurrence_id,
      reviewDate: row.review_date,
      lastWeekWindowStart: row.last_week_window_start,
      lastWeekWindowEnd: row.last_week_window_end,
      currentWeekWindowStart: row.current_week_window_start,
      currentWeekWindowEnd: row.current_week_window_end,
      carryForwardNotes: row.carry_forward_notes ?? null,
      completedAt: row.completed_at,
      completedByUserId: row.completed_by_user_id ?? null,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      version: row.version,
      recapNarrative: row.recap_narrative ?? null,
      overviewNarrative: row.overview_narrative ?? null,
      aiGenerationUsed: row.ai_generation_used === 1
    });
  }

  createReviewRecord(record: Omit<ReviewRecord, 'createdAt' | 'updatedAt' | 'version' | 'pendingSync'>): ReviewRecord {
    const now = new Date().toISOString();
    const full: ReviewRecord = {
      ...record,
      createdAt: now,
      updatedAt: now,
      version: 1
    };
    this.db.prepare(`
      INSERT INTO review_records (
        id, ritual_occurrence_id, review_date,
        last_week_window_start, last_week_window_end,
        current_week_window_start, current_week_window_end,
        carry_forward_notes, completed_at, completed_by_user_id,
        created_at, updated_at, version,
        recap_narrative, overview_narrative, ai_generation_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      full.id, full.ritualOccurrenceId, full.reviewDate,
      full.lastWeekWindowStart, full.lastWeekWindowEnd,
      full.currentWeekWindowStart, full.currentWeekWindowEnd,
      full.carryForwardNotes, full.completedAt, full.completedByUserId ?? null,
      full.createdAt, full.updatedAt, full.version,
      full.recapNarrative ?? null, full.overviewNarrative ?? null,
      (full.aiGenerationUsed ?? false) ? 1 : 0
    );
    return full;
  }

  getReviewRecord(reviewRecordId: string): ReviewRecord | null {
    const row = this.db
      .prepare('SELECT * FROM review_records WHERE id = ?')
      .get(reviewRecordId) as Record<string, unknown> | undefined;
    return row ? this.mapReviewRecordRow(row) : null;
  }

  /**
   * Atomically marks an occurrence complete with a review record reference,
   * and advances the routine's currentDueDate.
   * Returns false if the routine version check fails.
   */
  completeRitualOccurrence(
    updatedRoutine: Routine,
    occurrence: RoutineOccurrence,
    reviewRecord: ReviewRecord,
    expectedVersion: number
  ): boolean {
    const insertOccurrence = this.db.prepare(`
      INSERT INTO routine_occurrences (
        id, routine_id, due_date, completed_at, completed_by_user_id, skipped, review_record_id, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, NULL, ?)
    `);
    const insertRecord = this.db.prepare(`
      INSERT INTO review_records (
        id, ritual_occurrence_id, review_date,
        last_week_window_start, last_week_window_end,
        current_week_window_start, current_week_window_end,
        carry_forward_notes, completed_at, completed_by_user_id,
        created_at, updated_at, version,
        recap_narrative, overview_narrative, ai_generation_used
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const linkOccurrence = this.db.prepare(`
      UPDATE routine_occurrences SET review_record_id = ? WHERE id = ?
    `);
    const updateRoutine = this.db.prepare(`
      UPDATE routines
      SET current_due_date = ?, updated_at = ?, version = ?
      WHERE id = ? AND version = ?
    `);

    return this.db.transaction(() => {
      const result = updateRoutine.run(
        updatedRoutine.currentDueDate,
        updatedRoutine.updatedAt,
        updatedRoutine.version,
        updatedRoutine.id,
        expectedVersion
      );
      if (result.changes === 0) return false;

      // Insert occurrence first (review_records.ritual_occurrence_id FK references it)
      insertOccurrence.run(
        occurrence.id,
        occurrence.routineId,
        occurrence.dueDate,
        occurrence.completedAt,
        occurrence.completedByUserId ?? null,
        occurrence.skipped ? 1 : 0,
        occurrence.createdAt
      );

      // Now insert review record (occurrence exists, FK satisfied)
      insertRecord.run(
        reviewRecord.id, reviewRecord.ritualOccurrenceId, reviewRecord.reviewDate,
        reviewRecord.lastWeekWindowStart, reviewRecord.lastWeekWindowEnd,
        reviewRecord.currentWeekWindowStart, reviewRecord.currentWeekWindowEnd,
        reviewRecord.carryForwardNotes, reviewRecord.completedAt, reviewRecord.completedByUserId ?? null,
        reviewRecord.createdAt, reviewRecord.updatedAt, reviewRecord.version,
        reviewRecord.recapNarrative ?? null, reviewRecord.overviewNarrative ?? null,
        (reviewRecord.aiGenerationUsed ?? false) ? 1 : 0
      );

      // Link occurrence back to the review record
      linkOccurrence.run(reviewRecord.id, occurrence.id);

      return true;
    })();
  }

  // ─── Proactive Household Nudges ─────────────────────────────────────────────

  /**
   * Returns all active nudge payloads (unsorted). Priority sorting is done by the caller.
   * Overdue routines/rituals + approaching/overdue reminders within the 24h threshold.
   */
  getNudgePayloads(now: Date): Nudge[] {
    const thresholdDatetime = new Date(now.getTime() + NUDGE_APPROACHING_THRESHOLD_HOURS * 60 * 60 * 1000);
    const nudges: Nudge[] = [];

    // Overdue routines and planning rituals
    const overdueRoutineRows = this.db.prepare(`
      SELECT r.id, r.title, r.ritual_type, r.current_due_date
      FROM routines r
      WHERE r.status = 'active'
        AND r.current_due_date < ?
        AND NOT EXISTS (
          SELECT 1 FROM routine_occurrences o
          WHERE o.routine_id = r.id
            AND o.due_date = r.current_due_date
            AND o.completed_at IS NOT NULL
        )
    `).all(now.toISOString()) as Array<{ id: string; title: string; ritual_type: string | null; current_due_date: string }>;

    for (const row of overdueRoutineRows) {
      const entityType: Nudge['entityType'] = row.ritual_type === 'weekly_review' ? 'planningRitual' : 'routine';
      const overdueSince = row.current_due_date.slice(0, 10);
      const overdueDate = new Date(row.current_due_date);
      const daysAgo = Math.floor((now.getTime() - overdueDate.getTime()) / (1000 * 60 * 60 * 24));
      let triggerReason: string;
      if (daysAgo <= 1) {
        triggerReason = entityType === 'planningRitual' ? 'Weekly review · Overdue since yesterday' : 'Overdue since yesterday';
      } else if (daysAgo <= 7) {
        const weekday = overdueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        triggerReason = entityType === 'planningRitual' ? `Weekly review · Overdue since ${weekday}` : `Overdue since ${weekday}`;
      } else {
        triggerReason = entityType === 'planningRitual' ? 'Weekly review overdue' : 'Overdue — due last week';
      }
      nudges.push({ entityType, entityId: row.id, entityName: row.title, triggerReason, overdueSince, dueAt: null });
    }

    // Approaching and overdue reminders
    const reminderRows = this.db.prepare(`
      SELECT id, title, scheduled_at, snoozed_until
      FROM reminders
      WHERE completed_at IS NULL
        AND cancelled_at IS NULL
        AND COALESCE(snoozed_until, scheduled_at) <= ?
    `).all(thresholdDatetime.toISOString()) as Array<{ id: string; title: string; scheduled_at: string; snoozed_until: string | null }>;

    for (const row of reminderRows) {
      const effectiveDueAt = row.snoozed_until ?? row.scheduled_at;
      const dueDate = new Date(effectiveDueAt);
      const isPast = dueDate <= now;
      let triggerReason: string;
      if (isPast) {
        const dueDay = dueDate.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
        const dueHour = dueDate.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', timeZone: 'UTC' });
        triggerReason = `Overdue since ${dueDay} ${dueHour}`;
      } else {
        const msUntil = dueDate.getTime() - now.getTime();
        const hoursUntil = msUntil / (1000 * 60 * 60);
        if (hoursUntil < 1) {
          const minutesUntil = Math.round(msUntil / (1000 * 60));
          triggerReason = `Due in ${minutesUntil} minute${minutesUntil !== 1 ? 's' : ''}`;
        } else {
          const hoursRounded = Math.round(hoursUntil);
          triggerReason = `Due in ${hoursRounded} hour${hoursRounded !== 1 ? 's' : ''}`;
        }
      }
      nudges.push({
        entityType: 'reminder',
        entityId: row.id,
        entityName: row.title,
        triggerReason,
        overdueSince: isPast ? effectiveDueAt.slice(0, 10) : null,
        dueAt: effectiveDueAt
      });
    }

    // Freshness nudges (lowest priority tier — no meal plans per D-058)
    const freshnessNudges = this.getFreshnessNudges(now);
    nudges.push(...freshnessNudges);

    return nudges;
  }

  /**
   * Returns the last N completedAt timestamps for a routine, ordered newest-first.
   * Excludes skipped occurrences and null completedAt values.
   */
  getRoutineCompletionTimestamps(routineId: string, limit: number): string[] {
    const rows = this.db.prepare(`
      SELECT completed_at
      FROM routine_occurrences
      WHERE routine_id = ?
        AND completed_at IS NOT NULL
        AND skipped = 0
      ORDER BY completed_at DESC
      LIMIT ?
    `).all(routineId, limit) as Array<{ completed_at: string }>;

    return rows.map((r) => r.completed_at);
  }

  // ─── Push Subscriptions (H5 nudge push) ──────────────────────────────────────

  savePushSubscription(endpoint: string, p256dh: string, auth: string, userId?: string): PushSubscriptionRecord {
    const now = new Date().toISOString();
    const existing = this.db.prepare('SELECT id FROM push_subscriptions WHERE endpoint = ?').get(endpoint) as { id: string } | undefined;
    const id = existing?.id ?? randomUUID();

    this.db.prepare(`
      INSERT INTO push_subscriptions (id, household_id, endpoint, p256dh_key, auth_key, user_id, created_at, updated_at)
      VALUES (?, 'household', ?, ?, ?, ?, ?, ?)
      ON CONFLICT(endpoint) DO UPDATE SET
        p256dh_key = excluded.p256dh_key,
        auth_key = excluded.auth_key,
        user_id = excluded.user_id,
        updated_at = excluded.updated_at
    `).run(id, endpoint, p256dh, auth, userId ?? null, now, now);

    return this.db.prepare('SELECT * FROM push_subscriptions WHERE id = ?').get(id) as PushSubscriptionRecord;
  }

  deletePushSubscription(endpoint: string): void {
    this.db.prepare('DELETE FROM push_subscriptions WHERE endpoint = ?').run(endpoint);
  }

  listPushSubscriptions(): PushSubscriptionRecord[] {
    return this.db.prepare("SELECT * FROM push_subscriptions WHERE household_id = 'household'").all() as PushSubscriptionRecord[];
  }

  listPushSubscriptionsForUser(userId: string): PushSubscriptionRecord[] {
    return this.db.prepare(
      "SELECT * FROM push_subscriptions WHERE household_id = 'household' AND user_id = ?"
    ).all(userId) as PushSubscriptionRecord[];
  }

  getReminderCreatorUserId(reminderId: string): string | null {
    const row = this.db.prepare('SELECT created_by_user_id FROM reminders WHERE id = ?').get(reminderId) as { created_by_user_id: string | null } | undefined;
    return row?.created_by_user_id ?? null;
  }

  // ─── Push Notification Log (dedup) ───────────────────────────────────────────

  hasPushNotificationLog(subscriptionId: string, entityType: string, entityId: string, windowMs: number, now: Date): boolean {
    const cutoff = new Date(now.getTime() - windowMs).toISOString();
    const row = this.db.prepare(`
      SELECT COUNT(*) as cnt FROM push_notification_log
      WHERE subscription_id = ? AND entity_type = ? AND entity_id = ? AND sent_at > ?
    `).get(subscriptionId, entityType, entityId, cutoff) as { cnt: number };
    return row.cnt > 0;
  }

  recordPushNotificationLog(subscriptionId: string, entityType: string, entityId: string, now: Date): void {
    this.db.prepare(`
      INSERT INTO push_notification_log (id, subscription_id, entity_type, entity_id, sent_at)
      VALUES (?, ?, ?, ?, ?)
    `).run(randomUUID(), subscriptionId, entityType, entityId, now.toISOString());
  }

  purgeStalePushNotificationLog(retentionMs: number, now: Date): void {
    const cutoff = new Date(now.getTime() - retentionMs).toISOString();
    this.db.prepare('DELETE FROM push_notification_log WHERE sent_at < ?').run(cutoff);
  }

  getLastPushNotificationTime(subscriptionId: string, entityType: string, entityId: string): string | null {
    const row = this.db.prepare(`
      SELECT sent_at FROM push_notification_log
      WHERE subscription_id = ? AND entity_type = ? AND entity_id = ?
      ORDER BY sent_at DESC LIMIT 1
    `).get(subscriptionId, entityType, entityId) as { sent_at: string } | undefined;
    return row?.sent_at ?? null;
  }

  getUserName(userId: string): string | null {
    const row = this.db.prepare('SELECT name FROM users WHERE id = ?').get(userId) as { name: string } | undefined;
    return row?.name ?? null;
  }

  // ─── Chat Conversations ────────────────────────────────────────────────────

  getOrCreateConversation(now: Date): { id: string; createdAt: string; updatedAt: string } {
    const existing = this.db.prepare('SELECT * FROM conversations ORDER BY created_at DESC LIMIT 1').get() as Record<string, unknown> | undefined;
    if (existing) {
      return { id: String(existing.id), createdAt: String(existing.created_at), updatedAt: String(existing.updated_at) };
    }
    const id = randomUUID();
    const ts = now.toISOString();
    this.db.prepare('INSERT INTO conversations (id, created_at, updated_at) VALUES (?, ?, ?)').run(id, ts, ts);
    return { id, createdAt: ts, updatedAt: ts };
  }

  touchConversation(conversationId: string, now: Date): void {
    this.db.prepare('UPDATE conversations SET updated_at = ? WHERE id = ?').run(now.toISOString(), conversationId);
  }

  addChatMessage(msg: {
    id: string;
    conversationId: string;
    role: string;
    content: string;
    toolCalls: unknown[] | null;
    createdAt: string;
  }): void {
    this.db.prepare(`
      INSERT INTO conversation_messages (id, conversation_id, role, content, tool_calls, created_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(msg.id, msg.conversationId, msg.role, msg.content, msg.toolCalls ? JSON.stringify(msg.toolCalls) : null, msg.createdAt);
  }

  listChatMessages(conversationId: string, limit: number, before?: string): { messages: ChatMessageRow[]; hasMore: boolean } {
    let rows: Record<string, unknown>[];
    if (before) {
      rows = this.db.prepare(`
        SELECT * FROM conversation_messages
        WHERE conversation_id = ? AND created_at < (SELECT created_at FROM conversation_messages WHERE id = ?)
        ORDER BY created_at DESC LIMIT ?
      `).all(conversationId, before, limit + 1) as Record<string, unknown>[];
    } else {
      rows = this.db.prepare(`
        SELECT * FROM conversation_messages
        WHERE conversation_id = ?
        ORDER BY created_at DESC LIMIT ?
      `).all(conversationId, limit + 1) as Record<string, unknown>[];
    }
    const hasMore = rows.length > limit;
    const slice = hasMore ? rows.slice(0, limit) : rows;
    return {
      messages: slice.reverse().map(mapChatMessageRow),
      hasMore
    };
  }

  getRecentChatMessages(conversationId: string, limit: number): ChatMessageRow[] {
    const rows = this.db.prepare(`
      SELECT * FROM conversation_messages
      WHERE conversation_id = ?
      ORDER BY created_at DESC LIMIT ?
    `).all(conversationId, limit) as Record<string, unknown>[];
    return rows.reverse().map(mapChatMessageRow);
  }

  getChatMessage(messageId: string): ChatMessageRow | null {
    const row = this.db.prepare('SELECT * FROM conversation_messages WHERE id = ?').get(messageId) as Record<string, unknown> | undefined;
    return row ? mapChatMessageRow(row) : null;
  }

  updateToolCallStatus(messageId: string, toolCallId: string, status: string): boolean {
    const row = this.db.prepare('SELECT tool_calls FROM conversation_messages WHERE id = ?').get(messageId) as { tool_calls: string | null } | undefined;
    if (!row?.tool_calls) return false;
    const toolCalls = JSON.parse(row.tool_calls) as Array<{ id: string; status: string }>;
    const tc = toolCalls.find(t => t.id === toolCallId);
    if (!tc) return false;
    tc.status = status;
    this.db.prepare('UPDATE conversation_messages SET tool_calls = ? WHERE id = ?').run(JSON.stringify(toolCalls), messageId);
    return true;
  }

  findMessageByToolCallId(toolCallId: string): ChatMessageRow | null {
    const rows = this.db.prepare(
      "SELECT * FROM conversation_messages WHERE tool_calls IS NOT NULL ORDER BY created_at DESC"
    ).all() as Record<string, unknown>[];
    for (const row of rows) {
      const toolCalls = JSON.parse(String(row.tool_calls)) as Array<{ id: string }>;
      if (toolCalls.some(tc => tc.id === toolCallId)) {
        return mapChatMessageRow(row);
      }
    }
    return null;
  }

  clearConversation(conversationId: string): void {
    this.db.transaction(() => {
      this.db.prepare('DELETE FROM onboarding_sessions WHERE conversation_id = ?').run(conversationId);
      this.db.prepare('DELETE FROM conversation_messages WHERE conversation_id = ?').run(conversationId);
      this.db.prepare('DELETE FROM conversations WHERE id = ?').run(conversationId);
    })();
  }

  deleteChatMessage(messageId: string): boolean {
    const result = this.db.prepare('DELETE FROM conversation_messages WHERE id = ?').run(messageId);
    return result.changes > 0;
  }

  // ─── Onboarding (OLI-119) ─────────────────────────────────────────────────

  countTotalEntities(): number {
    const result = this.db.prepare(`
      SELECT
        (SELECT COUNT(*) FROM inbox_items WHERE archived_at IS NULL) +
        (SELECT COUNT(*) FROM reminders WHERE completed_at IS NULL AND cancelled_at IS NULL) +
        (SELECT COUNT(*) FROM routines WHERE archived_at IS NULL) +
        (SELECT COUNT(*) FROM shared_lists WHERE archived_at IS NULL) +
        (SELECT COUNT(*) FROM meal_plans WHERE archived_at IS NULL)
      AS total
    `).get() as { total: number };
    return result.total;
  }

  getOrCreateOnboardingConversation(now: Date): { id: string; createdAt: string; updatedAt: string } {
    const existing = this.db.prepare(
      "SELECT * FROM conversations WHERE type = 'onboarding' ORDER BY created_at DESC LIMIT 1"
    ).get() as Record<string, unknown> | undefined;
    if (existing) {
      return { id: String(existing.id), createdAt: String(existing.created_at), updatedAt: String(existing.updated_at) };
    }
    const id = randomUUID();
    const ts = now.toISOString();
    this.db.prepare(
      "INSERT INTO conversations (id, type, created_at, updated_at) VALUES (?, 'onboarding', ?, ?)"
    ).run(id, ts, ts);
    return { id, createdAt: ts, updatedAt: ts };
  }

  getOnboardingSession(): OnboardingSessionRow | null {
    const row = this.db.prepare(
      'SELECT * FROM onboarding_sessions ORDER BY created_at DESC LIMIT 1'
    ).get() as Record<string, unknown> | undefined;
    return row ? mapOnboardingSessionRow(row) : null;
  }

  createOnboardingSession(session: {
    id: string;
    conversationId: string;
    status: string;
    topicsCompleted: string[];
    currentTopic: string | null;
    entitiesCreated: number;
    createdAt: string;
    updatedAt: string;
  }): void {
    this.db.prepare(`
      INSERT INTO onboarding_sessions (id, conversation_id, status, topics_completed, current_topic, entities_created, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      session.id,
      session.conversationId,
      session.status,
      JSON.stringify(session.topicsCompleted),
      session.currentTopic,
      session.entitiesCreated,
      session.createdAt,
      session.updatedAt
    );
  }

  updateOnboardingSession(id: string, updates: {
    status?: string;
    topicsCompleted?: string[];
    currentTopic?: string | null;
    entitiesCreated?: number;
    updatedAt: string;
  }): void {
    const setClauses: string[] = ['updated_at = ?'];
    const params: unknown[] = [updates.updatedAt];

    if (updates.status !== undefined) {
      setClauses.push('status = ?');
      params.push(updates.status);
    }
    if (updates.topicsCompleted !== undefined) {
      setClauses.push('topics_completed = ?');
      params.push(JSON.stringify(updates.topicsCompleted));
    }
    if (updates.currentTopic !== undefined) {
      setClauses.push('current_topic = ?');
      params.push(updates.currentTopic);
    }
    if (updates.entitiesCreated !== undefined) {
      setClauses.push('entities_created = ?');
      params.push(updates.entitiesCreated);
    }

    params.push(id);
    this.db.prepare(`UPDATE onboarding_sessions SET ${setClauses.join(', ')} WHERE id = ?`).run(...params);
  }

  incrementOnboardingEntitiesCreated(sessionId: string, count: number, now: Date): void {
    this.db.prepare(
      'UPDATE onboarding_sessions SET entities_created = entities_created + ?, updated_at = ? WHERE id = ?'
    ).run(count, now.toISOString(), sessionId);
  }

  // ─── Data Freshness ────────────────────────────────────────────────────────

  getStaleItems(now: Date, limit: number = 10): { items: StaleItem[]; totalStaleCount: number } {
    const staleItems: Array<StaleItem & { sortDate: string }> = [];

    // 1. Stale inbox items
    const inboxRows = this.db.prepare(`
      SELECT id, title, last_status_changed_at, freshness_checked_at
      FROM inbox_items
      WHERE status IN ('open', 'in_progress') AND archived_at IS NULL
    `).all() as Array<{ id: string; title: string; last_status_changed_at: string; freshness_checked_at: string | null }>;

    for (const row of inboxRows) {
      const refDate = row.freshness_checked_at ?? row.last_status_changed_at;
      const daysSince = Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 14) {
        const lastActivityAt = new Date(refDate).toISOString();
        staleItems.push({
          entityType: 'inbox',
          entityId: row.id,
          entityName: row.title,
          lastActivityAt,
          lastActivityDescription: computeLastActivityDescription('inbox', lastActivityAt, now),
          sortDate: lastActivityAt
        });
      }
    }

    // 2. Stale routines
    const routineRows = this.db.prepare(`
      SELECT r.id, r.title, r.interval_days, r.freshness_checked_at,
             r.created_at, r.updated_at, r.ritual_type,
             (SELECT MAX(o.completed_at) FROM routine_occurrences o WHERE o.routine_id = r.id AND o.completed_at IS NOT NULL) AS last_completed_at
      FROM routines r
      WHERE r.status = 'active'
    `).all() as Array<{ id: string; title: string; interval_days: number | null; freshness_checked_at: string | null; created_at: string; updated_at: string; ritual_type: string | null; last_completed_at: string | null }>;

    for (const row of routineRows) {
      if (row.ritual_type === 'weekly_review') continue; // Skip planning rituals
      const intervalDays = row.interval_days ?? 7;
      const freshnessRef = row.freshness_checked_at;
      const lastCompleted = row.last_completed_at;
      // Use the same logic as isRoutineStale but with raw values to avoid Zod parsing overhead
      const refDate = freshnessRef ?? lastCompleted ?? row.created_at;
      const threshold = intervalDays * 2;
      const daysSince = Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= threshold) {
        staleItems.push({
          entityType: 'routine',
          entityId: row.id,
          entityName: row.title,
          lastActivityAt: new Date(refDate).toISOString(),
          lastActivityDescription: computeLastActivityDescription('routine', new Date(refDate).toISOString(), now),
          sortDate: new Date(refDate).toISOString()
        });
      }
    }

    // 3. Stale reminders (active, 7+ days past scheduledAt)
    const reminderRows = this.db.prepare(`
      SELECT id, title, scheduled_at, freshness_checked_at
      FROM reminders
      WHERE completed_at IS NULL AND cancelled_at IS NULL
    `).all() as Array<{ id: string; title: string; scheduled_at: string; freshness_checked_at: string | null }>;

    for (const row of reminderRows) {
      const refDate = row.freshness_checked_at ?? row.scheduled_at;
      const daysSince = Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 7) {
        const lastActivityAt = new Date(refDate).toISOString();
        staleItems.push({
          entityType: 'reminder',
          entityId: row.id,
          entityName: row.title,
          lastActivityAt,
          lastActivityDescription: computeLastActivityDescription('reminder', lastActivityAt, now),
          sortDate: lastActivityAt
        });
      }
    }

    // 4. Stale shared lists (active, unchecked items, no modification in 30+ days)
    const listRows = this.db.prepare(`
      SELECT sl.id, sl.title, sl.updated_at, sl.freshness_checked_at,
             EXISTS(SELECT 1 FROM list_items li WHERE li.list_id = sl.id AND li.checked = 0) AS has_unchecked
      FROM shared_lists sl
      WHERE sl.status = 'active'
    `).all() as Array<{ id: string; title: string; updated_at: string; freshness_checked_at: string | null; has_unchecked: number }>;

    for (const row of listRows) {
      if (row.has_unchecked !== 1) continue;
      const refDate = row.freshness_checked_at ?? row.updated_at;
      const daysSince = Math.floor((now.getTime() - new Date(refDate).getTime()) / (1000 * 60 * 60 * 24));
      if (daysSince >= 30) {
        const lastActivityAt = new Date(refDate).toISOString();
        staleItems.push({
          entityType: 'list',
          entityId: row.id,
          entityName: row.title,
          lastActivityAt,
          lastActivityDescription: computeLastActivityDescription('list', lastActivityAt, now),
          sortDate: lastActivityAt
        });
      }
    }

    // 5. Stale meal plans (health-check-only)
    const currentWeekStart = new Date(now);
    currentWeekStart.setDate(currentWeekStart.getDate() - currentWeekStart.getDay());
    const weekStartStr = currentWeekStart.toISOString().slice(0, 10);
    const currentWeekHasEntries = (this.db.prepare(
      'SELECT COUNT(*) AS cnt FROM meal_plans WHERE week_start_date = ? AND status = ?'
    ).get(weekStartStr, 'active') as { cnt: number }).cnt > 0;
    const hasPriorUsage = (this.db.prepare(
      'SELECT COUNT(*) AS cnt FROM meal_plans WHERE status IN (?, ?)'
    ).get('active', 'archived') as { cnt: number }).cnt > 0;

    if (isMealPlanStale(currentWeekHasEntries, hasPriorUsage)) {
      staleItems.push({
        entityType: 'mealPlan',
        entityId: 'meal-plan-freshness',
        entityName: 'Meal planning',
        lastActivityAt: now.toISOString(),
        lastActivityDescription: computeLastActivityDescription('mealPlan', now.toISOString(), now),
        sortDate: now.toISOString()
      });
    }

    // Sort oldest first, cap at limit
    staleItems.sort((a, b) => a.sortDate < b.sortDate ? -1 : a.sortDate > b.sortDate ? 1 : 0);
    const totalStaleCount = staleItems.length;
    const items: StaleItem[] = staleItems.slice(0, limit).map(({ sortDate: _, ...item }) => item);

    return { items, totalStaleCount };
  }

  getFreshnessNudges(now: Date): Nudge[] {
    const nudges: Nudge[] = [];
    const { items } = this.getStaleItems(now, 100);

    for (const item of items) {
      // Meal plans: health-check-only, no nudges
      if (item.entityType === 'mealPlan') continue;

      const subType = item.entityType as 'inbox' | 'routine' | 'reminder' | 'list';
      nudges.push({
        entityType: 'freshness',
        entityId: item.entityId,
        entityName: item.entityName,
        triggerReason: generateFreshnessNudgeCopy(subType, item.entityName, item.lastActivityAt, now),
        overdueSince: item.lastActivityAt.slice(0, 10),
        dueAt: null,
        entitySubType: subType
      });
    }

    return nudges;
  }

  confirmFreshness(entityType: StaleItemEntityType, entityId: string, now: Date, expectedVersion: number): { newVersion: number } | null {
    const timestamp = now.toISOString();
    const newVersion = expectedVersion + 1;

    const tableMap: Record<StaleItemEntityType, string> = {
      inbox: 'inbox_items',
      routine: 'routines',
      reminder: 'reminders',
      list: 'shared_lists',
      mealPlan: 'meal_plans'
    };

    const table = tableMap[entityType];
    const result = this.db.prepare(
      `UPDATE ${table} SET freshness_checked_at = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?`
    ).run(timestamp, timestamp, newVersion, entityId, expectedVersion);

    return result.changes > 0 ? { newVersion } : null;
  }

  archiveEntity(entityType: ArchivableEntityType, entityId: string, now: Date, expectedVersion: number): { newVersion: number } | null {
    const timestamp = now.toISOString();
    const newVersion = expectedVersion + 1;

    let sql: string;
    switch (entityType) {
      case 'inbox':
        sql = `UPDATE inbox_items SET status = 'done', archived_at = ?, updated_at = ?, last_status_changed_at = ?, version = ? WHERE id = ? AND version = ?`;
        return this.db.prepare(sql).run(timestamp, timestamp, timestamp, newVersion, entityId, expectedVersion).changes > 0 ? { newVersion } : null;
      case 'routine':
        sql = `UPDATE routines SET status = 'paused', archived_at = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?`;
        return this.db.prepare(sql).run(timestamp, timestamp, newVersion, entityId, expectedVersion).changes > 0 ? { newVersion } : null;
      case 'reminder':
        sql = `UPDATE reminders SET cancelled_at = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?`;
        return this.db.prepare(sql).run(timestamp, timestamp, newVersion, entityId, expectedVersion).changes > 0 ? { newVersion } : null;
      case 'list':
        sql = `UPDATE shared_lists SET status = 'archived', archived_at = ?, updated_at = ?, version = ? WHERE id = ? AND version = ?`;
        return this.db.prepare(sql).run(timestamp, timestamp, newVersion, entityId, expectedVersion).changes > 0 ? { newVersion } : null;
    }
  }

  getHealthCheckState(now: Date): HealthCheckState {
    const row = this.db.prepare('SELECT * FROM household_freshness WHERE id = ?').get('singleton') as Record<string, unknown> | undefined;

    if (!row) {
      return { lastCompletedAt: null, lastDismissedAt: null, shouldShow: true };
    }

    const lastCompletedAt = row.last_health_check_completed_at as string | null;
    const lastDismissedAt = row.last_health_check_dismissed_at as string | null;

    // Check if dismissed today
    let dismissedToday = false;
    if (lastDismissedAt) {
      const dismissedDate = new Date(lastDismissedAt);
      dismissedToday = dismissedDate.toISOString().slice(0, 10) === now.toISOString().slice(0, 10);
    }

    let shouldShow = false;
    if (dismissedToday) {
      shouldShow = false;
    } else if (!lastCompletedAt) {
      shouldShow = true;
    } else {
      const daysSince = Math.floor((now.getTime() - new Date(lastCompletedAt).getTime()) / (1000 * 60 * 60 * 24));
      shouldShow = daysSince >= 30;
    }

    return {
      lastCompletedAt: lastCompletedAt ?? null,
      lastDismissedAt: lastDismissedAt ?? null,
      shouldShow
    };
  }

  completeHealthCheck(now: Date): void {
    const timestamp = now.toISOString();
    this.db.prepare(`
      INSERT INTO household_freshness (id, last_health_check_completed_at, created_at, updated_at)
      VALUES ('singleton', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_health_check_completed_at = ?, updated_at = ?
    `).run(timestamp, timestamp, timestamp, timestamp, timestamp);
  }

  dismissHealthCheck(now: Date): void {
    const timestamp = now.toISOString();
    this.db.prepare(`
      INSERT INTO household_freshness (id, last_health_check_dismissed_at, created_at, updated_at)
      VALUES ('singleton', ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET last_health_check_dismissed_at = ?, updated_at = ?
    `).run(timestamp, timestamp, timestamp, timestamp, timestamp);
  }
}

export type OnboardingSessionRow = {
  id: string;
  conversationId: string;
  status: string;
  topicsCompleted: string[];
  currentTopic: string | null;
  entitiesCreated: number;
  createdAt: string;
  updatedAt: string;
};

export type ChatMessageRow = {
  id: string;
  conversationId: string;
  role: string;
  content: string;
  toolCalls: Array<{ id: string; type: string; data: Record<string, unknown>; status: string }> | null;
  createdAt: string;
};

const mapChatMessageRow = (row: Record<string, unknown>): ChatMessageRow => ({
  id: String(row.id),
  conversationId: String(row.conversation_id),
  role: String(row.role),
  content: String(row.content),
  toolCalls: row.tool_calls ? JSON.parse(String(row.tool_calls)) : null,
  createdAt: String(row.created_at)
});

const mapOnboardingSessionRow = (row: Record<string, unknown>): OnboardingSessionRow => ({
  id: String(row.id),
  conversationId: String(row.conversation_id),
  status: String(row.status),
  topicsCompleted: JSON.parse(String(row.topics_completed)),
  currentTopic: row.current_topic ? String(row.current_topic) : null,
  entitiesCreated: Number(row.entities_created),
  createdAt: String(row.created_at),
  updatedAt: String(row.updated_at)
});
