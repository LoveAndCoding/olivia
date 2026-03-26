-- OLI-318: In-app feedback mechanism
-- Stores user-submitted feedback with auto-captured context

CREATE TABLE IF NOT EXISTS feedback (
  id TEXT PRIMARY KEY NOT NULL,
  household_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  category TEXT NOT NULL DEFAULT 'bug',
  description TEXT NOT NULL,
  context_json TEXT NOT NULL,
  screenshot_base64 TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_feedback_status ON feedback (status);
CREATE INDEX idx_feedback_household_id ON feedback (household_id);
CREATE INDEX idx_feedback_created_at ON feedback (created_at);
