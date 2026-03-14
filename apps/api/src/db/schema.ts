import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const inboxItemsTable = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner').notNull(),
  status: text('status').notNull(),
  dueAt: text('due_at'),
  dueText: text('due_text'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  lastStatusChangedAt: text('last_status_changed_at').notNull(),
  lastNoteAt: text('last_note_at'),
  archivedAt: text('archived_at')
});

export const inboxItemHistoryTable = sqliteTable('inbox_item_history', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  actorRole: text('actor_role').notNull(),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  createdAt: text('created_at').notNull()
});

export const deviceSyncStateTable = sqliteTable('device_sync_state', {
  deviceId: text('device_id').primaryKey(),
  lastCursor: integer('last_cursor').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const notificationSubscriptionsTable = sqliteTable('notification_subscriptions', {
  id: text('id').primaryKey(),
  actorRole: text('actor_role').notNull(),
  endpoint: text('endpoint').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull()
});

export const remindersTable = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  note: text('note'),
  owner: text('owner').notNull(),
  linkedInboxItemId: text('linked_inbox_item_id'),
  recurrenceCadence: text('recurrence_cadence').notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  snoozedUntil: text('snoozed_until'),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull()
});

export const reminderTimelineTable = sqliteTable('reminder_timeline', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull(),
  actorRole: text('actor_role').notNull(),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull()
});

export const reminderNotificationPreferencesTable = sqliteTable('reminder_notification_preferences', {
  actorRole: text('actor_role').primaryKey(),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  dueRemindersEnabled: integer('due_reminders_enabled', { mode: 'boolean' }).notNull(),
  dailySummaryEnabled: integer('daily_summary_enabled', { mode: 'boolean' }).notNull(),
  updatedAt: text('updated_at').notNull()
});

export const notificationDeliveryLogTable = sqliteTable('notification_delivery_log', {
  id: text('id').primaryKey(),
  notificationType: text('notification_type').notNull(),
  actorRole: text('actor_role').notNull(),
  reminderId: text('reminder_id'),
  deliveryBucket: text('delivery_bucket').notNull(),
  deliveredAt: text('delivered_at').notNull()
});

export const schemaMigrationsTable = sqliteTable('schema_migrations', {
  filename: text('filename').primaryKey(),
  appliedAt: text('applied_at').notNull()
});
