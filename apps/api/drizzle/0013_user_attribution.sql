-- User attribution migration (OLI-282 Phase 3)
-- Adds userId columns alongside existing owner/actorRole columns
-- for gradual migration to user-based identity.

-- Inbox items: owner → created_by_user_id
ALTER TABLE inbox_items ADD COLUMN created_by_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_inbox_items_user ON inbox_items(created_by_user_id);

-- Inbox item history: actorRole → user_id
ALTER TABLE inbox_item_history ADD COLUMN user_id TEXT REFERENCES users(id);

-- Reminders: owner → created_by_user_id
ALTER TABLE reminders ADD COLUMN created_by_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_reminders_user ON reminders(created_by_user_id);

-- Reminder timeline: actorRole → user_id
ALTER TABLE reminder_timeline ADD COLUMN user_id TEXT REFERENCES users(id);

-- Reminder notification preferences: actorRole → user_id
-- This table uses actorRole as PRIMARY KEY, so we add a new column
ALTER TABLE reminder_notification_preferences ADD COLUMN user_id TEXT REFERENCES users(id);

-- Notification delivery log: actorRole → user_id
ALTER TABLE notification_delivery_log ADD COLUMN user_id TEXT REFERENCES users(id);

-- Notification subscriptions: actorRole → user_id
ALTER TABLE notification_subscriptions ADD COLUMN user_id TEXT REFERENCES users(id);

-- Shared lists: owner → created_by_user_id
ALTER TABLE shared_lists ADD COLUMN created_by_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_shared_lists_user ON shared_lists(created_by_user_id);

-- List item history: actorRole → user_id
ALTER TABLE list_item_history ADD COLUMN user_id TEXT REFERENCES users(id);

-- Routines: owner → created_by_user_id
ALTER TABLE routines ADD COLUMN created_by_user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_routines_user ON routines(created_by_user_id);

-- Routine occurrences: completedBy → completed_by_user_id
ALTER TABLE routine_occurrences ADD COLUMN completed_by_user_id TEXT REFERENCES users(id);

-- Conversations: add user_id for per-user chat history
ALTER TABLE conversations ADD COLUMN user_id TEXT REFERENCES users(id);
CREATE INDEX IF NOT EXISTS idx_conversations_user ON conversations(user_id);

-- Onboarding sessions: add user_id
ALTER TABLE onboarding_sessions ADD COLUMN user_id TEXT REFERENCES users(id);

-- Review records: completedBy → completed_by_user_id
ALTER TABLE review_records ADD COLUMN completed_by_user_id TEXT REFERENCES users(id);
