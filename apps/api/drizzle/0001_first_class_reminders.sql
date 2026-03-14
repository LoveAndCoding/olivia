CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  owner TEXT NOT NULL,
  linked_inbox_item_id TEXT,
  recurrence_cadence TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  snoozed_until TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  FOREIGN KEY(linked_inbox_item_id) REFERENCES inbox_items(id)
);

CREATE INDEX IF NOT EXISTS reminders_scheduled_at_idx ON reminders(scheduled_at);
CREATE INDEX IF NOT EXISTS reminders_linked_inbox_item_id_idx ON reminders(linked_inbox_item_id);

CREATE TABLE IF NOT EXISTS reminder_timeline (
  id TEXT PRIMARY KEY NOT NULL,
  reminder_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  metadata TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(reminder_id) REFERENCES reminders(id)
);

CREATE INDEX IF NOT EXISTS reminder_timeline_reminder_id_created_at_idx ON reminder_timeline(reminder_id, created_at DESC);

CREATE TABLE IF NOT EXISTS reminder_notification_preferences (
  actor_role TEXT PRIMARY KEY NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  due_reminders_enabled INTEGER NOT NULL DEFAULT 0,
  daily_summary_enabled INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_delivery_log (
  id TEXT PRIMARY KEY NOT NULL,
  notification_type TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  reminder_id TEXT,
  delivery_bucket TEXT NOT NULL,
  delivered_at TEXT NOT NULL,
  FOREIGN KEY(reminder_id) REFERENCES reminders(id)
);

CREATE UNIQUE INDEX IF NOT EXISTS notification_delivery_log_type_actor_bucket_idx
ON notification_delivery_log(notification_type, actor_role, delivery_bucket);
