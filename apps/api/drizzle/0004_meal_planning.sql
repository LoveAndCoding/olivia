CREATE TABLE IF NOT EXISTS meal_plans (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  week_start_date TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active',
  generated_list_refs TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  archived_at TEXT,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS meal_entries (
  id TEXT PRIMARY KEY,
  plan_id TEXT NOT NULL REFERENCES meal_plans(id) ON DELETE CASCADE,
  day_of_week INTEGER NOT NULL CHECK(day_of_week >= 0 AND day_of_week <= 6),
  name TEXT NOT NULL,
  shopping_items TEXT NOT NULL DEFAULT '[]',
  position INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
);

CREATE INDEX IF NOT EXISTS meal_entries_plan_id_idx ON meal_entries(plan_id);
CREATE INDEX IF NOT EXISTS meal_entries_plan_day_idx ON meal_entries(plan_id, day_of_week, position);
