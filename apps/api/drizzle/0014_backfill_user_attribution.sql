-- Backfill user attribution columns (OLI-283)
-- Maps all existing actorRole/owner data to the primary admin user.
-- After this migration, new userId columns contain valid user references.

-- Backfill entity owner columns → created_by_user_id
UPDATE inbox_items SET created_by_user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE created_by_user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE reminders SET created_by_user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE created_by_user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE shared_lists SET created_by_user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE created_by_user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE routines SET created_by_user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE created_by_user_id IS NULL AND EXISTS (SELECT 1 FROM users);

-- Backfill history/timeline actorRole columns → user_id
UPDATE inbox_item_history SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE reminder_timeline SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE list_item_history SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

-- Backfill notification-related tables
UPDATE reminder_notification_preferences SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE notification_delivery_log SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE notification_subscriptions SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

-- Backfill routine occurrences completed_by → completed_by_user_id
UPDATE routine_occurrences SET completed_by_user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE completed_by IS NOT NULL AND completed_by_user_id IS NULL AND EXISTS (SELECT 1 FROM users);

-- Backfill conversations and onboarding sessions
UPDATE conversations SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

UPDATE onboarding_sessions SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);

-- Backfill review_records
UPDATE review_records SET completed_by_user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE completed_by_user_id IS NULL AND EXISTS (SELECT 1 FROM users);

-- Make push_subscriptions.user_id reference the primary user where null
UPDATE push_subscriptions SET user_id = (
  SELECT id FROM users WHERE role = 'admin' ORDER BY created_at ASC LIMIT 1
) WHERE user_id IS NULL AND EXISTS (SELECT 1 FROM users);
