-- Phase 1: Add ritual_type to routines
ALTER TABLE routines ADD COLUMN ritual_type TEXT CHECK(ritual_type IN ('weekly_review')) DEFAULT NULL;

-- Phase 2: Create review_records table (must be created before adding FK on routine_occurrences)
CREATE TABLE IF NOT EXISTS review_records (
  id TEXT PRIMARY KEY NOT NULL,
  ritual_occurrence_id TEXT NOT NULL,
  review_date TEXT NOT NULL,                 -- YYYY-MM-DD
  last_week_window_start TEXT NOT NULL,      -- YYYY-MM-DD
  last_week_window_end TEXT NOT NULL,        -- YYYY-MM-DD
  current_week_window_start TEXT NOT NULL,   -- YYYY-MM-DD
  current_week_window_end TEXT NOT NULL,     -- YYYY-MM-DD
  carry_forward_notes TEXT,                  -- nullable
  completed_at TEXT NOT NULL,                -- ISO datetime
  completed_by TEXT NOT NULL,                -- owner value
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1,
  FOREIGN KEY(ritual_occurrence_id) REFERENCES routine_occurrences(id)
);

CREATE INDEX IF NOT EXISTS idx_review_records_occurrence_id ON review_records(ritual_occurrence_id);

-- Phase 3: Add review_record_id FK to routine_occurrences
ALTER TABLE routine_occurrences ADD COLUMN review_record_id TEXT DEFAULT NULL REFERENCES review_records(id) ON DELETE SET NULL;
