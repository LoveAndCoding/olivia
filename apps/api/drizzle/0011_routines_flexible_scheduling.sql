-- Add weekdays column (JSON array of integers 0-6, e.g. "[0,3]" for Mon,Thu)
ALTER TABLE routines ADD COLUMN weekdays TEXT;

-- Add interval_weeks column for every_n_weeks recurrence
ALTER TABLE routines ADD COLUMN interval_weeks INTEGER;

-- Make current_due_date nullable: SQLite requires table rebuild
-- Step 1: Create new table without NOT NULL on current_due_date
CREATE TABLE routines_new (
  id TEXT PRIMARY KEY NOT NULL,
  title TEXT NOT NULL,
  owner TEXT NOT NULL,
  recurrence_rule TEXT NOT NULL,
  interval_days INTEGER,
  interval_weeks INTEGER,
  weekdays TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  current_due_date TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  version INTEGER NOT NULL,
  ritual_type TEXT,
  freshness_checked_at TEXT
);

-- Step 2: Copy data from old table
INSERT INTO routines_new (id, title, owner, recurrence_rule, interval_days, interval_weeks, weekdays, status, current_due_date, created_at, updated_at, archived_at, version, ritual_type, freshness_checked_at)
SELECT id, title, owner, recurrence_rule, interval_days, NULL, NULL, status, current_due_date, created_at, updated_at, archived_at, version, ritual_type, freshness_checked_at
FROM routines;

-- Step 3: Drop old table
DROP TABLE routines;

-- Step 4: Rename new table
ALTER TABLE routines_new RENAME TO routines;

-- Step 5: Recreate indexes
CREATE INDEX IF NOT EXISTS routines_status_idx ON routines(status);
CREATE INDEX IF NOT EXISTS routines_current_due_date_idx ON routines(current_due_date ASC);
