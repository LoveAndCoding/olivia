-- OLI-312: Unify push notification pipeline
-- Merge push_subscriptions into notification_subscriptions (the surviving table).
-- Web push subscriptions are stored as JSON payload in notification_subscriptions,
-- matching the existing APNs pattern (polymorphic payload dispatch).

-- Migrate existing push_subscriptions data into notification_subscriptions.
-- Convert the separate p256dh_key/auth_key columns into JSON payload format:
-- { "endpoint": "...", "keys": { "p256dh": "...", "auth": "..." } }
INSERT OR IGNORE INTO notification_subscriptions (id, user_id, endpoint, payload, created_at)
  SELECT
    id,
    user_id,
    endpoint,
    json_object(
      'endpoint', endpoint,
      'keys', json_object('p256dh', p256dh_key, 'auth', auth_key)
    ),
    created_at
  FROM push_subscriptions;

-- Recreate push_notification_log without the FK to push_subscriptions.
-- The subscription_id column now references notification_subscriptions IDs.
CREATE TABLE push_notification_log_new (
  id TEXT PRIMARY KEY NOT NULL,
  subscription_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  sent_at TEXT NOT NULL
);
INSERT INTO push_notification_log_new (id, subscription_id, entity_type, entity_id, sent_at)
  SELECT id, subscription_id, entity_type, entity_id, sent_at FROM push_notification_log;
DROP TABLE push_notification_log;
ALTER TABLE push_notification_log_new RENAME TO push_notification_log;
CREATE INDEX IF NOT EXISTS idx_push_notification_log_dedup
  ON push_notification_log(subscription_id, entity_type, entity_id, sent_at);

-- Drop the separate push_subscriptions table
DROP TABLE IF EXISTS push_subscriptions;
