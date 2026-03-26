-- OLI-310: Remove actorRole from all tables
-- The dual identity system (stakeholder/spouse via actorRole) is replaced by
-- user-based identity resolved from the session token.
-- SQLite does not support DROP COLUMN directly in all versions, so we recreate
-- affected tables without the actor_role column.

-- 1. inbox_item_history: drop actor_role
CREATE TABLE inbox_item_history_new (
  id TEXT PRIMARY KEY,
  item_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO inbox_item_history_new (id, item_id, user_id, event_type, from_value, to_value, created_at)
  SELECT id, item_id, user_id, event_type, from_value, to_value, created_at FROM inbox_item_history;
DROP TABLE inbox_item_history;
ALTER TABLE inbox_item_history_new RENAME TO inbox_item_history;

-- 2. notification_subscriptions: drop actor_role
CREATE TABLE notification_subscriptions_new (
  id TEXT PRIMARY KEY,
  user_id TEXT,
  endpoint TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
INSERT INTO notification_subscriptions_new (id, user_id, endpoint, payload, created_at)
  SELECT id, user_id, endpoint, payload, created_at FROM notification_subscriptions;
DROP TABLE notification_subscriptions;
ALTER TABLE notification_subscriptions_new RENAME TO notification_subscriptions;

-- 3. reminder_timeline: drop actor_role
CREATE TABLE reminder_timeline_new (
  id TEXT PRIMARY KEY,
  reminder_id TEXT NOT NULL,
  user_id TEXT,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO reminder_timeline_new (id, reminder_id, user_id, event_type, from_value, to_value, metadata, created_at)
  SELECT id, reminder_id, user_id, event_type, from_value, to_value, metadata, created_at FROM reminder_timeline;
DROP TABLE reminder_timeline;
ALTER TABLE reminder_timeline_new RENAME TO reminder_timeline;

-- 4. reminder_notification_preferences: change PK from actor_role to user_id
CREATE TABLE reminder_notification_preferences_new (
  user_id TEXT PRIMARY KEY,
  enabled INTEGER NOT NULL,
  due_reminders_enabled INTEGER NOT NULL,
  daily_summary_enabled INTEGER NOT NULL,
  updated_at TEXT NOT NULL
);
INSERT INTO reminder_notification_preferences_new (user_id, enabled, due_reminders_enabled, daily_summary_enabled, updated_at)
  SELECT user_id, enabled, due_reminders_enabled, daily_summary_enabled, updated_at
  FROM reminder_notification_preferences WHERE user_id IS NOT NULL;
DROP TABLE reminder_notification_preferences;
ALTER TABLE reminder_notification_preferences_new RENAME TO reminder_notification_preferences;

-- 5. notification_delivery_log: drop actor_role
CREATE TABLE notification_delivery_log_new (
  id TEXT PRIMARY KEY,
  notification_type TEXT NOT NULL,
  user_id TEXT,
  reminder_id TEXT,
  delivery_bucket TEXT NOT NULL,
  delivered_at TEXT NOT NULL
);
INSERT INTO notification_delivery_log_new (id, notification_type, user_id, reminder_id, delivery_bucket, delivered_at)
  SELECT id, notification_type, user_id, reminder_id, delivery_bucket, delivered_at FROM notification_delivery_log;
DROP TABLE notification_delivery_log;
ALTER TABLE notification_delivery_log_new RENAME TO notification_delivery_log;

-- 6. list_item_history: drop actor_role
CREATE TABLE list_item_history_new (
  id TEXT PRIMARY KEY,
  list_id TEXT NOT NULL,
  item_id TEXT,
  user_id TEXT,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO list_item_history_new (id, list_id, item_id, user_id, event_type, from_value, to_value, created_at)
  SELECT id, list_id, item_id, user_id, event_type, from_value, to_value, created_at FROM list_item_history;
DROP TABLE list_item_history;
ALTER TABLE list_item_history_new RENAME TO list_item_history;
