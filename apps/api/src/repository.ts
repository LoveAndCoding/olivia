import { randomUUID } from 'node:crypto';
import Database from 'better-sqlite3';
import { computeReminderState } from '@olivia/domain';
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
  routineOccurrenceSchema,
  routineSchema,
  sharedListSchema,
  type ActorRole,
  type GeneratedListRef,
  type HistoryEntry,
  type InboxItem,
  type ListItem,
  type ListItemHistoryEntry,
  type MealEntry,
  type MealPlan,
  type NotificationSubscription,
  type Reminder,
  type ReminderNotificationPreferences,
  type ReminderTimelineEntry,
  type Routine,
  type RoutineOccurrence,
  type RoutineStatus,
  type SharedList
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

const mapSharedListRow = (row: Record<string, unknown>): SharedList =>
  sharedListSchema.parse({
    id: row.id,
    title: row.title,
    owner: row.owner,
    status: row.status,
    // Summary counts are computed separately and not stored on the row; default to 0
    activeItemCount: 0,
    checkedItemCount: 0,
    allChecked: false,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    archivedAt: row.archived_at ?? null,
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
    actorRole: row.actor_role,
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
      INSERT INTO shared_lists (id, title, owner, status, created_at, updated_at, archived_at, version)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertHistory = this.db.prepare(`
      INSERT INTO list_item_history (id, list_id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      insertList.run(
        list.id, list.title, list.owner, list.status,
        list.createdAt, list.updatedAt, list.archivedAt, list.version
      );
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.actorRole, historyEntry.eventType,
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
      INSERT INTO list_item_history (id, list_id, item_id, actor_role, event_type, from_value, to_value, created_at)
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
        historyEntry.actorRole, historyEntry.eventType,
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
      INSERT INTO list_item_history (id, list_id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      insertItem.run(
        item.id, item.listId, item.body, item.checked ? 1 : 0, item.checkedAt,
        item.position, item.createdAt, item.updatedAt, item.version
      );
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.actorRole, historyEntry.eventType,
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
      INSERT INTO list_item_history (id, list_id, item_id, actor_role, event_type, from_value, to_value, created_at)
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
        historyEntry.actorRole, historyEntry.eventType,
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
      INSERT INTO list_item_history (id, list_id, item_id, actor_role, event_type, from_value, to_value, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `);

    this.db.transaction(() => {
      deleteItem.run(itemId, listId);
      insertHistory.run(
        historyEntry.id, historyEntry.listId, historyEntry.itemId,
        historyEntry.actorRole, historyEntry.eventType,
        historyEntry.fromValue ? JSON.stringify(historyEntry.fromValue) : null,
        historyEntry.toValue ? JSON.stringify(historyEntry.toValue) : null,
        historyEntry.createdAt
      );
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
    const base = routineSchema.parse({
      id: row.id,
      title: row.title,
      owner: row.owner,
      recurrenceRule: row.recurrence_rule,
      intervalDays: row.interval_days ?? null,
      status: row.status,
      currentDueDate: row.current_due_date,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
      archivedAt: row.archived_at ?? null,
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
      completedBy: row.completed_by ?? null,
      skipped: Boolean(row.skipped),
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
        id, title, owner, recurrence_rule, interval_days, status, current_due_date,
        created_at, updated_at, archived_at, version
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      routine.id, routine.title, routine.owner, routine.recurrenceRule, routine.intervalDays,
      routine.status, routine.currentDueDate, routine.createdAt, routine.updatedAt, routine.archivedAt, routine.version
    );
  }

  updateRoutine(routine: Routine, expectedVersion: number): boolean {
    const result = this.db.prepare(`
      UPDATE routines
      SET title = ?, owner = ?, recurrence_rule = ?, interval_days = ?, status = ?,
          current_due_date = ?, updated_at = ?, archived_at = ?, version = ?
      WHERE id = ? AND version = ?
    `).run(
      routine.title, routine.owner, routine.recurrenceRule, routine.intervalDays, routine.status,
      routine.currentDueDate, routine.updatedAt, routine.archivedAt, routine.version,
      routine.id, expectedVersion
    );
    return result.changes > 0;
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
      INSERT INTO routine_occurrences (id, routine_id, due_date, completed_at, completed_by, skipped, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
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
        occurrence.completedBy,
        occurrence.skipped ? 1 : 0,
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
