import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const inboxItemsTable = sqliteTable('inbox_items', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  description: text('description'),
  owner: text('owner').notNull(),
  createdByUserId: text('created_by_user_id'),
  status: text('status').notNull(),
  dueAt: text('due_at'),
  dueText: text('due_text'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  lastStatusChangedAt: text('last_status_changed_at').notNull(),
  lastNoteAt: text('last_note_at'),
  archivedAt: text('archived_at'),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const inboxItemHistoryTable = sqliteTable('inbox_item_history', {
  id: text('id').primaryKey(),
  itemId: text('item_id').notNull(),
  actorRole: text('actor_role').notNull(),
  userId: text('user_id'),
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
  userId: text('user_id'),
  endpoint: text('endpoint').notNull(),
  payload: text('payload').notNull(),
  createdAt: text('created_at').notNull()
});

export const remindersTable = sqliteTable('reminders', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  note: text('note'),
  owner: text('owner').notNull(),
  createdByUserId: text('created_by_user_id'),
  linkedInboxItemId: text('linked_inbox_item_id'),
  recurrenceCadence: text('recurrence_cadence').notNull(),
  scheduledAt: text('scheduled_at').notNull(),
  snoozedUntil: text('snoozed_until'),
  completedAt: text('completed_at'),
  cancelledAt: text('cancelled_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull(),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const reminderTimelineTable = sqliteTable('reminder_timeline', {
  id: text('id').primaryKey(),
  reminderId: text('reminder_id').notNull(),
  actorRole: text('actor_role').notNull(),
  userId: text('user_id'),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  metadata: text('metadata'),
  createdAt: text('created_at').notNull()
});

export const reminderNotificationPreferencesTable = sqliteTable('reminder_notification_preferences', {
  actorRole: text('actor_role').primaryKey(),
  userId: text('user_id'),
  enabled: integer('enabled', { mode: 'boolean' }).notNull(),
  dueRemindersEnabled: integer('due_reminders_enabled', { mode: 'boolean' }).notNull(),
  dailySummaryEnabled: integer('daily_summary_enabled', { mode: 'boolean' }).notNull(),
  updatedAt: text('updated_at').notNull()
});

export const notificationDeliveryLogTable = sqliteTable('notification_delivery_log', {
  id: text('id').primaryKey(),
  notificationType: text('notification_type').notNull(),
  actorRole: text('actor_role').notNull(),
  userId: text('user_id'),
  reminderId: text('reminder_id'),
  deliveryBucket: text('delivery_bucket').notNull(),
  deliveredAt: text('delivered_at').notNull()
});

export const schemaMigrationsTable = sqliteTable('schema_migrations', {
  filename: text('filename').primaryKey(),
  appliedAt: text('applied_at').notNull()
});

export const sharedListsTable = sqliteTable('shared_lists', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  owner: text('owner').notNull(),
  createdByUserId: text('created_by_user_id'),
  status: text('status').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  version: integer('version').notNull(),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const listItemsTable = sqliteTable('list_items', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull(),
  body: text('body').notNull(),
  checked: integer('checked', { mode: 'boolean' }).notNull(),
  checkedAt: text('checked_at'),
  position: integer('position').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull()
});

export const listItemHistoryTable = sqliteTable('list_item_history', {
  id: text('id').primaryKey(),
  listId: text('list_id').notNull(),
  itemId: text('item_id'),
  actorRole: text('actor_role').notNull(),
  userId: text('user_id'),
  eventType: text('event_type').notNull(),
  fromValue: text('from_value'),
  toValue: text('to_value'),
  createdAt: text('created_at').notNull()
});

export const routinesTable = sqliteTable('routines', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  owner: text('owner').notNull(),
  createdByUserId: text('created_by_user_id'),
  recurrenceRule: text('recurrence_rule').notNull(),
  intervalDays: integer('interval_days'),
  intervalWeeks: integer('interval_weeks'),
  weekdays: text('weekdays'),
  status: text('status').notNull(),
  currentDueDate: text('current_due_date'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  version: integer('version').notNull(),
  ritualType: text('ritual_type'),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const routineOccurrencesTable = sqliteTable('routine_occurrences', {
  id: text('id').primaryKey(),
  routineId: text('routine_id').notNull(),
  dueDate: text('due_date').notNull(),
  completedAt: text('completed_at'),
  completedBy: text('completed_by'),
  completedByUserId: text('completed_by_user_id'),
  skipped: integer('skipped', { mode: 'boolean' }).notNull(),
  createdAt: text('created_at').notNull()
});

export const mealPlansTable = sqliteTable('meal_plans', {
  id: text('id').primaryKey(),
  title: text('title').notNull(),
  weekStartDate: text('week_start_date').notNull(),
  status: text('status').notNull(),
  generatedListRefs: text('generated_list_refs').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  archivedAt: text('archived_at'),
  version: integer('version').notNull(),
  freshnessCheckedAt: text('freshness_checked_at')
});

export const mealEntriesTable = sqliteTable('meal_entries', {
  id: text('id').primaryKey(),
  planId: text('plan_id').notNull(),
  dayOfWeek: integer('day_of_week').notNull(),
  name: text('name').notNull(),
  shoppingItems: text('shopping_items').notNull(),
  position: integer('position').notNull(),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
  version: integer('version').notNull()
});

export const pushSubscriptionsTable = sqliteTable('push_subscriptions', {
  id: text('id').primaryKey(),
  householdId: text('household_id').notNull(),
  endpoint: text('endpoint').notNull().unique(),
  p256dhKey: text('p256dh_key').notNull(),
  authKey: text('auth_key').notNull(),
  userId: text('user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull(),
});

export const pushNotificationLogTable = sqliteTable('push_notification_log', {
  id: text('id').primaryKey(),
  subscriptionId: text('subscription_id').notNull(),
  entityType: text('entity_type').notNull(),
  entityId: text('entity_id').notNull(),
  sentAt: text('sent_at').notNull(),
});

export const conversationsTable = sqliteTable('conversations', {
  id: text('id').primaryKey(),
  type: text('type').notNull().default('general'),
  userId: text('user_id'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const onboardingSessionsTable = sqliteTable('onboarding_sessions', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  userId: text('user_id'),
  status: text('status').notNull().default('started'),
  topicsCompleted: text('topics_completed').notNull().default('[]'),
  currentTopic: text('current_topic'),
  entitiesCreated: integer('entities_created').notNull().default(0),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const householdFreshnessTable = sqliteTable('household_freshness', {
  id: text('id').primaryKey().default('singleton'),
  lastHealthCheckCompletedAt: text('last_health_check_completed_at'),
  lastHealthCheckDismissedAt: text('last_health_check_dismissed_at'),
  createdAt: text('created_at').notNull(),
  updatedAt: text('updated_at').notNull()
});

export const conversationMessagesTable = sqliteTable('conversation_messages', {
  id: text('id').primaryKey(),
  conversationId: text('conversation_id').notNull(),
  role: text('role').notNull(),
  content: text('content').notNull(),
  toolCalls: text('tool_calls'),
  createdAt: text('created_at').notNull()
});
