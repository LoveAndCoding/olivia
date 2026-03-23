-- Auth & Identity tables for M32 multi-user household (OLI-282)

-- users: household members with identity
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY NOT NULL,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  household_id TEXT NOT NULL DEFAULT 'household',
  role TEXT NOT NULL DEFAULT 'admin' CHECK(role IN ('admin', 'member')),
  pin_hash TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_users_household ON users(household_id);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- sessions: opaque server-managed sessions (not JWT)
CREATE TABLE IF NOT EXISTS sessions (
  id TEXT PRIMARY KEY NOT NULL,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  device_id TEXT,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_token_hash ON sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);

-- magic_link_tokens: one-time tokens for email-based auth
CREATE TABLE IF NOT EXISTS magic_link_tokens (
  id TEXT PRIMARY KEY NOT NULL,
  email TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_magic_link_tokens_hash ON magic_link_tokens(token_hash);

-- household_invitations: invite codes for adding household members
CREATE TABLE IF NOT EXISTS household_invitations (
  id TEXT PRIMARY KEY NOT NULL,
  household_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  email TEXT,
  invited_by_user_id TEXT NOT NULL REFERENCES users(id),
  status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'claimed', 'expired')),
  claimed_by_user_id TEXT REFERENCES users(id),
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_invitations_code ON household_invitations(code);
CREATE INDEX IF NOT EXISTS idx_invitations_household ON household_invitations(household_id);
