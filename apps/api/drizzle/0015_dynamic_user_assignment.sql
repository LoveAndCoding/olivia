-- Replaces role-based owner enum (stakeholder/spouse/unassigned) with userId-based assignment.
-- owner column → assignee_user_id (nullable), completed_by → use completed_by_user_id.
-- Table rebuilds required because SQLite cannot change NOT NULL → nullable.

-- ─── Inbox items ───────────────────────────────────────────────────────────────
CREATE TABLE inbox_items_new (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  assignee_user_id TEXT,
  created_by_user_id TEXT,
  status TEXT NOT NULL,
  due_at TEXT,
  due_text TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  last_status_changed_at TEXT NOT NULL,
  last_note_at TEXT,
  archived_at TEXT,
  freshness_checked_at TEXT
);
INSERT INTO inbox_items_new (id, title, description, assignee_user_id, created_by_user_id, status, due_at, due_text, created_at, updated_at, version, last_status_changed_at, last_note_at, archived_at, freshness_checked_at)
SELECT id, title, description,
  CASE owner
    WHEN 'unassigned' THEN NULL
    WHEN 'stakeholder' THEN (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    WHEN 'spouse' THEN (SELECT id FROM users WHERE role = 'member' LIMIT 1)
    ELSE NULL
  END,
  created_by_user_id, status, due_at, due_text, created_at, updated_at, version, last_status_changed_at, last_note_at, archived_at, freshness_checked_at
FROM inbox_items;
DROP TABLE inbox_items;
ALTER TABLE inbox_items_new RENAME TO inbox_items;

-- ─── Reminders ─────────────────────────────────────────────────────────────────
CREATE TABLE reminders_new (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  note TEXT,
  assignee_user_id TEXT,
  created_by_user_id TEXT,
  linked_inbox_item_id TEXT,
  recurrence_cadence TEXT NOT NULL,
  scheduled_at TEXT NOT NULL,
  snoozed_until TEXT,
  completed_at TEXT,
  cancelled_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  freshness_checked_at TEXT
);
INSERT INTO reminders_new (id, title, note, assignee_user_id, created_by_user_id, linked_inbox_item_id, recurrence_cadence, scheduled_at, snoozed_until, completed_at, cancelled_at, created_at, updated_at, version, freshness_checked_at)
SELECT id, title, note,
  CASE owner
    WHEN 'unassigned' THEN NULL
    WHEN 'stakeholder' THEN (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    WHEN 'spouse' THEN (SELECT id FROM users WHERE role = 'member' LIMIT 1)
    ELSE NULL
  END,
  created_by_user_id, linked_inbox_item_id, recurrence_cadence, scheduled_at, snoozed_until, completed_at, cancelled_at, created_at, updated_at, version, freshness_checked_at
FROM reminders;
DROP TABLE reminders;
ALTER TABLE reminders_new RENAME TO reminders;

-- ─── Shared lists ──────────────────────────────────────────────────────────────
CREATE TABLE shared_lists_new (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  assignee_user_id TEXT,
  created_by_user_id TEXT,
  status TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  version INTEGER NOT NULL,
  freshness_checked_at TEXT
);
INSERT INTO shared_lists_new (id, title, assignee_user_id, created_by_user_id, status, created_at, updated_at, archived_at, version, freshness_checked_at)
SELECT id, title,
  CASE owner
    WHEN 'stakeholder' THEN (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    WHEN 'spouse' THEN (SELECT id FROM users WHERE role = 'member' LIMIT 1)
    ELSE NULL
  END,
  created_by_user_id, status, created_at, updated_at, archived_at, version, freshness_checked_at
FROM shared_lists;
DROP TABLE shared_lists;
ALTER TABLE shared_lists_new RENAME TO shared_lists;

-- ─── Routines ──────────────────────────────────────────────────────────────────
CREATE TABLE routines_new (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  assignee_user_id TEXT,
  created_by_user_id TEXT,
  recurrence_rule TEXT NOT NULL,
  interval_days INTEGER,
  interval_weeks INTEGER,
  weekdays TEXT,
  status TEXT NOT NULL,
  current_due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  version INTEGER NOT NULL,
  ritual_type TEXT,
  freshness_checked_at TEXT
);
INSERT INTO routines_new (id, title, assignee_user_id, created_by_user_id, recurrence_rule, interval_days, interval_weeks, weekdays, status, current_due_date, created_at, updated_at, archived_at, version, ritual_type, freshness_checked_at)
SELECT id, title,
  CASE owner
    WHEN 'unassigned' THEN NULL
    WHEN 'stakeholder' THEN (SELECT id FROM users WHERE role = 'admin' LIMIT 1)
    WHEN 'spouse' THEN (SELECT id FROM users WHERE role = 'member' LIMIT 1)
    ELSE NULL
  END,
  created_by_user_id, recurrence_rule, interval_days, interval_weeks, weekdays, status, current_due_date, created_at, updated_at, archived_at, version, ritual_type, freshness_checked_at
FROM routines;
DROP TABLE routines;
ALTER TABLE routines_new RENAME TO routines;

-- ─── Routine occurrences: drop completed_by ────────────────────────────────────
CREATE TABLE routine_occurrences_new (
  id TEXT PRIMARY KEY NOT NULL,
  routine_id TEXT NOT NULL,
  due_date TEXT NOT NULL,
  completed_at TEXT,
  completed_by_user_id TEXT,
  skipped INTEGER NOT NULL,
  review_record_id TEXT,
  created_at TEXT NOT NULL
);
INSERT INTO routine_occurrences_new (id, routine_id, due_date, completed_at, completed_by_user_id, skipped, review_record_id, created_at)
SELECT id, routine_id, due_date, completed_at, completed_by_user_id, skipped, review_record_id, created_at
FROM routine_occurrences;
DROP TABLE routine_occurrences;
ALTER TABLE routine_occurrences_new RENAME TO routine_occurrences;

-- ─── Review records: drop completed_by ─────────────────────────────────────────
CREATE TABLE review_records_new (
  id TEXT PRIMARY KEY NOT NULL,
  ritual_occurrence_id TEXT NOT NULL,
  review_date TEXT NOT NULL,
  last_week_window_start TEXT NOT NULL,
  last_week_window_end TEXT NOT NULL,
  current_week_window_start TEXT NOT NULL,
  current_week_window_end TEXT NOT NULL,
  carry_forward_notes TEXT,
  completed_at TEXT NOT NULL,
  completed_by_user_id TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL,
  recap_narrative TEXT,
  overview_narrative TEXT,
  ai_generation_used INTEGER NOT NULL DEFAULT 0,
  FOREIGN KEY(ritual_occurrence_id) REFERENCES routine_occurrences(id)
);
INSERT INTO review_records_new (id, ritual_occurrence_id, review_date, last_week_window_start, last_week_window_end, current_week_window_start, current_week_window_end, carry_forward_notes, completed_at, completed_by_user_id, created_at, updated_at, version, recap_narrative, overview_narrative, ai_generation_used)
SELECT id, ritual_occurrence_id, review_date, last_week_window_start, last_week_window_end, current_week_window_start, current_week_window_end, carry_forward_notes, completed_at, completed_by_user_id, created_at, updated_at, version, recap_narrative, overview_narrative, ai_generation_used
FROM review_records;
DROP TABLE review_records;
ALTER TABLE review_records_new RENAME TO review_records;
CREATE INDEX IF NOT EXISTS idx_review_records_occurrence_id ON review_records(ritual_occurrence_id);
