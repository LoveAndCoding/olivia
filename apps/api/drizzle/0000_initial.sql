CREATE TABLE IF NOT EXISTS inbox_items (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  owner TEXT NOT NULL,
  status TEXT NOT NULL,
  due_at TEXT,
  due_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  last_status_changed_at TEXT NOT NULL,
  last_note_at TEXT,
  archived_at TEXT
);

CREATE TABLE IF NOT EXISTS inbox_item_history (
  id TEXT PRIMARY KEY NOT NULL,
  item_id TEXT NOT NULL,
  actor_role TEXT NOT NULL,
  event_type TEXT NOT NULL,
  from_value TEXT,
  to_value TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY(item_id) REFERENCES inbox_items(id)
);

CREATE TABLE IF NOT EXISTS device_sync_state (
  device_id TEXT PRIMARY KEY NOT NULL,
  last_cursor INTEGER NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS notification_subscriptions (
  id TEXT PRIMARY KEY NOT NULL,
  actor_role TEXT NOT NULL,
  endpoint TEXT NOT NULL UNIQUE,
  payload TEXT NOT NULL,
  created_at TEXT NOT NULL
);
