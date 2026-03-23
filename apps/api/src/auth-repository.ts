import { randomUUID, randomBytes, createHash, timingSafeEqual } from 'node:crypto';
import type Database from 'better-sqlite3';
import type { User, AuthUser, UserRole } from '@olivia/contracts';

// ─── Token Hashing ──────────────────────────────────────────────────

export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}

export function generateToken(): string {
  return randomBytes(32).toString('base64url');
}

export function generateInviteCode(): string {
  // 6 alphanumeric characters, uppercase
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // exclude confusable chars: 0/O, 1/I
  let code = '';
  const bytes = randomBytes(6);
  for (let i = 0; i < 6; i++) {
    code += chars[bytes[i]! % chars.length];
  }
  return code;
}

function hashPin(pin: string): string {
  // For a household app with 4-6 digit PINs, SHA-256 with salt is sufficient.
  // PINs are a convenience mechanism, not the primary auth path.
  const salt = randomBytes(16).toString('hex');
  const hash = createHash('sha256').update(salt + pin).digest('hex');
  return `${salt}:${hash}`;
}

function verifyPin(pin: string, storedHash: string): boolean {
  const [salt, hash] = storedHash.split(':');
  if (!salt || !hash) return false;
  const computed = createHash('sha256').update(salt + pin).digest('hex');
  // Use timingSafeEqual to prevent timing attacks on PIN hash comparison
  const computedBuf = Buffer.from(computed, 'utf-8');
  const storedBuf = Buffer.from(hash, 'utf-8');
  if (computedBuf.length !== storedBuf.length) return false;
  return timingSafeEqual(computedBuf, storedBuf);
}

// ─── Row Mapping ────────────────────────────────────────────────────

function mapUserRow(row: Record<string, unknown>): User {
  return {
    id: row.id as string,
    name: row.name as string,
    email: row.email as string,
    householdId: row.household_id as string,
    role: row.role as UserRole,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string
  };
}

// ─── Session Constants ──────────────────────────────────────────────

const SESSION_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000; // 30 days
const MAGIC_LINK_LIFETIME_MS = 15 * 60 * 1000; // 15 minutes

// ─── Auth Repository ────────────────────────────────────────────────

export class AuthRepository {
  constructor(private db: Database.Database) {}

  // ── Users ──

  findUserByEmail(email: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE email = ?')
      .get(email.toLowerCase()) as Record<string, unknown> | undefined;
    return row ? mapUserRow(row) : null;
  }

  findUserById(id: string): User | null {
    const row = this.db
      .prepare('SELECT * FROM users WHERE id = ?')
      .get(id) as Record<string, unknown> | undefined;
    return row ? mapUserRow(row) : null;
  }

  findUsersByHousehold(householdId: string): User[] {
    const rows = this.db
      .prepare('SELECT * FROM users WHERE household_id = ? ORDER BY created_at ASC')
      .all(householdId) as Array<Record<string, unknown>>;
    return rows.map(mapUserRow);
  }

  createUser(params: { name: string; email: string; householdId: string; role: UserRole }): User {
    const id = randomUUID();
    const now = new Date().toISOString();
    this.db
      .prepare(`
        INSERT INTO users (id, name, email, household_id, role, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      .run(id, params.name, params.email.toLowerCase(), params.householdId, params.role, now, now);
    return this.findUserById(id)!;
  }

  setUserPin(userId: string, pin: string): void {
    const hashed = hashPin(pin);
    this.db
      .prepare('UPDATE users SET pin_hash = ?, updated_at = ? WHERE id = ?')
      .run(hashed, new Date().toISOString(), userId);
  }

  verifyUserPin(userId: string, pin: string): boolean {
    const row = this.db
      .prepare('SELECT pin_hash FROM users WHERE id = ?')
      .get(userId) as { pin_hash: string | null } | undefined;
    if (!row?.pin_hash) return false;
    return verifyPin(pin, row.pin_hash);
  }

  // ── Sessions ──

  createSession(userId: string, deviceId?: string): { token: string; expiresAt: string } {
    const id = randomUUID();
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
    const now = new Date().toISOString();

    this.db
      .prepare(`
        INSERT INTO sessions (id, user_id, device_id, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, ?)
      `)
      .run(id, userId, deviceId ?? null, tokenHash, expiresAt, now);

    return { token, expiresAt };
  }

  validateSession(token: string): AuthUser | null {
    const tokenHash = hashToken(token);
    const now = new Date().toISOString();

    const row = this.db
      .prepare(`
        SELECT s.id AS session_id, s.expires_at, u.id, u.name, u.email, u.household_id, u.role
        FROM sessions s
        JOIN users u ON u.id = s.user_id
        WHERE s.token_hash = ? AND s.expires_at > ?
      `)
      .get(tokenHash, now) as Record<string, unknown> | undefined;

    if (!row) return null;

    // Sliding expiry: refresh on each authenticated request
    const newExpiry = new Date(Date.now() + SESSION_LIFETIME_MS).toISOString();
    this.db
      .prepare('UPDATE sessions SET expires_at = ? WHERE id = ?')
      .run(newExpiry, row.session_id as string);

    return {
      userId: row.id as string,
      householdId: row.household_id as string,
      role: row.role as UserRole,
      name: row.name as string,
      email: row.email as string
    };
  }

  deleteSession(token: string): void {
    const tokenHash = hashToken(token);
    this.db.prepare('DELETE FROM sessions WHERE token_hash = ?').run(tokenHash);
  }

  deleteUserSessions(userId: string): void {
    this.db.prepare('DELETE FROM sessions WHERE user_id = ?').run(userId);
  }

  cleanExpiredSessions(): number {
    const now = new Date().toISOString();
    const result = this.db.prepare('DELETE FROM sessions WHERE expires_at <= ?').run(now);
    return result.changes;
  }

  // ── Magic Link Tokens ──

  createMagicLinkToken(email: string): string {
    const id = randomUUID();
    const token = generateToken();
    const tokenHash = hashToken(token);
    const expiresAt = new Date(Date.now() + MAGIC_LINK_LIFETIME_MS).toISOString();
    const now = new Date().toISOString();

    // Invalidate any existing unused tokens for this email
    this.db
      .prepare('UPDATE magic_link_tokens SET used_at = ? WHERE email = ? AND used_at IS NULL')
      .run(now, email.toLowerCase());

    this.db
      .prepare(`
        INSERT INTO magic_link_tokens (id, email, token_hash, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?)
      `)
      .run(id, email.toLowerCase(), tokenHash, expiresAt, now);

    return token;
  }

  validateMagicLinkToken(token: string): { email: string } | null {
    const tokenHash = hashToken(token);
    const now = new Date().toISOString();

    const row = this.db
      .prepare(`
        SELECT id, email FROM magic_link_tokens
        WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL
      `)
      .get(tokenHash, now) as { id: string; email: string } | undefined;

    if (!row) return null;

    // Mark as used (single-use)
    this.db
      .prepare('UPDATE magic_link_tokens SET used_at = ? WHERE id = ?')
      .run(now, row.id);

    return { email: row.email };
  }

  // ── Invitations ──

  createInvitation(params: { householdId: string; invitedByUserId: string; email?: string }): {
    code: string;
    expiresAt: string;
  } {
    const id = randomUUID();
    const code = generateInviteCode();
    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days
    const now = new Date().toISOString();

    this.db
      .prepare(`
        INSERT INTO household_invitations (id, household_id, code, email, invited_by_user_id, status, expires_at, created_at)
        VALUES (?, ?, ?, ?, ?, 'pending', ?, ?)
      `)
      .run(id, params.householdId, code, params.email?.toLowerCase() ?? null, params.invitedByUserId, expiresAt, now);

    return { code, expiresAt };
  }

  claimInvitation(code: string, claimedByUserId: string): boolean {
    const now = new Date().toISOString();

    const row = this.db
      .prepare(`
        SELECT id FROM household_invitations
        WHERE code = ? AND status = 'pending' AND expires_at > ?
      `)
      .get(code.toUpperCase(), now) as { id: string } | undefined;

    if (!row) return false;

    this.db
      .prepare(`
        UPDATE household_invitations
        SET status = 'claimed', claimed_by_user_id = ?
        WHERE id = ?
      `)
      .run(claimedByUserId, row.id);

    return true;
  }

  findPendingInvitations(householdId: string): Array<{
    id: string;
    code: string;
    email: string | null;
    status: 'pending' | 'claimed' | 'expired';
    expiresAt: string;
    createdAt: string;
  }> {
    const now = new Date().toISOString();

    // Expire any past-due invitations
    this.db
      .prepare(`
        UPDATE household_invitations
        SET status = 'expired'
        WHERE household_id = ? AND status = 'pending' AND expires_at <= ?
      `)
      .run(householdId, now);

    const rows = this.db
      .prepare(`
        SELECT id, code, email, status, expires_at, created_at
        FROM household_invitations
        WHERE household_id = ? AND status = 'pending'
        ORDER BY created_at DESC
      `)
      .all(householdId) as Array<Record<string, unknown>>;

    return rows.map((row) => ({
      id: row.id as string,
      code: row.code as string,
      email: row.email as string | null,
      status: row.status as 'pending',
      expiresAt: row.expires_at as string,
      createdAt: row.created_at as string
    }));
  }

  revokeInvitation(invitationId: string, householdId: string): boolean {
    const result = this.db
      .prepare(`
        UPDATE household_invitations
        SET status = 'expired'
        WHERE id = ? AND household_id = ? AND status = 'pending'
      `)
      .run(invitationId, householdId);
    return result.changes > 0;
  }

  findInvitationByCode(code: string): {
    id: string;
    householdId: string;
    email: string | null;
    status: string;
    expiresAt: string;
  } | null {
    const now = new Date().toISOString();
    const row = this.db
      .prepare(`
        SELECT id, household_id, email, status, expires_at
        FROM household_invitations
        WHERE code = ? AND status = 'pending' AND expires_at > ?
      `)
      .get(code.toUpperCase(), now) as Record<string, unknown> | undefined;

    if (!row) return null;
    return {
      id: row.id as string,
      householdId: row.household_id as string,
      email: row.email as string | null,
      status: row.status as string,
      expiresAt: row.expires_at as string
    };
  }

  // ── Setup Check ──

  hasAnyUsers(): boolean {
    const row = this.db.prepare('SELECT COUNT(*) AS count FROM users').get() as { count: number };
    return row.count > 0;
  }

  getHouseholdMemberCount(householdId: string): number {
    const row = this.db
      .prepare('SELECT COUNT(*) AS count FROM users WHERE household_id = ?')
      .get(householdId) as { count: number };
    return row.count;
  }
}
