-- OLI-320: Automation rules engine
-- Stores user-defined automation rules and execution log

CREATE TABLE IF NOT EXISTS automation_rules (
  id TEXT PRIMARY KEY NOT NULL,
  household_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  trigger_type TEXT NOT NULL,
  trigger_threshold INTEGER NOT NULL DEFAULT 3,
  action_type TEXT NOT NULL,
  scope_type TEXT NOT NULL DEFAULT 'all',
  scope_entity_id TEXT,
  enabled INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX idx_automation_rules_household_id ON automation_rules (household_id);
CREATE INDEX idx_automation_rules_enabled ON automation_rules (enabled);

CREATE TABLE IF NOT EXISTS automation_log (
  id TEXT PRIMARY KEY NOT NULL,
  rule_id TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  executed_at TEXT NOT NULL,
  user_id TEXT NOT NULL
);

CREATE INDEX idx_automation_log_rule_id ON automation_log (rule_id);
CREATE INDEX idx_automation_log_executed_at ON automation_log (executed_at);
