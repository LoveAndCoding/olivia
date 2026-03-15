CREATE TABLE IF NOT EXISTS routines (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  recurrence_rule TEXT NOT NULL,
  interval_days INTEGER,
  status TEXT NOT NULL DEFAULT 'active',
  current_due_date TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  version INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS routines_status_idx ON routines(status);
CREATE INDEX IF NOT EXISTS routines_current_due_date_idx ON routines(current_due_date ASC);

CREATE TABLE IF NOT EXISTS routine_occurrences (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  completed_at TEXT,
  completed_by TEXT,
  skipped INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY(routine_id) REFERENCES routines(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS routine_occurrences_routine_id_due_date_idx ON routine_occurrences(routine_id, due_date DESC);
