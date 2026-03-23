import type { FastifyInstance, FastifyBaseLogger } from 'fastify';
import {
  requestMagicLinkRequestSchema,
  verifyMagicLinkRequestSchema,
  setupAccountRequestSchema,
  setPinRequestSchema,
  verifyPinRequestSchema,
  generateInviteRequestSchema,
  claimInviteRequestSchema
} from '@olivia/contracts';
import type { AuthRepository } from './auth-repository';
import type { AppConfig } from './config';

// ─── Email Provider (pluggable) ─────────────────────────────────────

export type EmailProvider = {
  sendMagicLink(email: string, token: string, baseUrl: string): Promise<boolean>;
};

export function createLogOnlyEmailProvider(log: FastifyBaseLogger): EmailProvider {
  return {
    async sendMagicLink(email: string, token: string, baseUrl: string): Promise<boolean> {
      const link = `${baseUrl}/auth/verify?token=${encodeURIComponent(token)}`;
      log.info({ email, link }, 'Magic link generated (email delivery not configured)');
      return true;
    }
  };
}

// ─── Route Options ──────────────────────────────────────────────────

export type AuthRoutesOptions = {
  authRepository: AuthRepository;
  emailProvider: EmailProvider;
  config: AppConfig;
};

// ─── Auth Routes ────────────────────────────────────────────────────

export async function registerAuthRoutes(
  app: FastifyInstance,
  { authRepository, emailProvider, config }: AuthRoutesOptions
): Promise<void> {
  // ── Auth Status (is the system set up?) ──

  app.get('/api/auth/status', async (_request, reply) => {
    const hasUsers = authRepository.hasAnyUsers();
    return reply.send({
      initialized: hasUsers,
      requiresSetup: !hasUsers
    });
  });

  // ── Account Setup (first user / migration path) ──

  app.post('/api/auth/setup', async (request, reply) => {
    const body = setupAccountRequestSchema.parse(request.body);

    // Only allow setup if no users exist yet
    if (authRepository.hasAnyUsers()) {
      return reply.status(409).send({
        error: 'ALREADY_INITIALIZED',
        message: 'A household admin already exists. Use magic link to sign in or an invite code to join.'
      });
    }

    // Create the admin user
    const user = authRepository.createUser({
      name: body.name,
      email: body.email,
      householdId: 'household',
      role: 'admin'
    });

    // Create session immediately — user just created their account, sign them in
    const session = authRepository.createSession(user.id);

    return reply.send({
      user,
      sessionToken: session.token,
      magicLinkSent: false,
      message: 'Account created. You are now signed in.'
    });
  });

  // ── Request Magic Link ──

  app.post('/api/auth/magic-link', async (request, reply) => {
    const body = requestMagicLinkRequestSchema.parse(request.body);

    // Always return success to prevent email enumeration
    const user = authRepository.findUserByEmail(body.email);
    if (!user) {
      return reply.send({
        sent: true,
        message: 'If that email is associated with a household, a sign-in link has been sent.'
      });
    }

    const token = authRepository.createMagicLinkToken(body.email);
    try {
      await emailProvider.sendMagicLink(body.email, token, config.pwaOrigin);
    } catch (err) {
      request.log.error({ err, email: body.email }, 'Failed to send magic link email');
      return reply.status(502).send({
        sent: false,
        message: 'Unable to send sign-in email. Please try again shortly.'
      });
    }

    return reply.send({
      sent: true,
      message: 'If that email is associated with a household, a sign-in link has been sent.'
    });
  });

  // ── Verify Magic Link Token ──

  app.post('/api/auth/verify', async (request, reply) => {
    const body = verifyMagicLinkRequestSchema.parse(request.body);

    const result = authRepository.validateMagicLinkToken(body.token);
    if (!result) {
      return reply.status(401).send({
        error: 'INVALID_TOKEN',
        message: 'This sign-in link has expired or already been used. Request a new one.'
      });
    }

    const user = authRepository.findUserByEmail(result.email);
    if (!user) {
      return reply.status(404).send({
        error: 'USER_NOT_FOUND',
        message: 'No account found for this email.'
      });
    }

    const session = authRepository.createSession(user.id);

    return reply.send({
      user,
      sessionToken: session.token
    });
  });

  // ── Get Current User ──

  app.get('/api/auth/me', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({
        error: 'UNAUTHENTICATED',
        message: 'Not signed in.'
      });
    }

    const user = authRepository.findUserById(request.user.userId);
    if (!user) {
      return reply.status(404).send({
        error: 'USER_NOT_FOUND',
        message: 'User account not found.'
      });
    }

    return reply.send({ user });
  });

  // ── Set PIN ──

  app.post('/api/auth/pin/set', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'UNAUTHENTICATED', message: 'Not signed in.' });
    }

    const body = setPinRequestSchema.parse(request.body);
    authRepository.setUserPin(request.user.userId, body.pin);

    return reply.send({ ok: true });
  });

  // ── Verify PIN (switch user on shared device) ──

  app.post('/api/auth/pin/verify', async (request, reply) => {
    const body = verifyPinRequestSchema.parse(request.body);

    const valid = authRepository.verifyUserPin(body.userId, body.pin);
    if (!valid) {
      return reply.status(401).send({
        error: 'INVALID_PIN',
        message: 'Incorrect PIN. Try again.'
      });
    }

    const user = authRepository.findUserById(body.userId);
    if (!user) {
      return reply.status(404).send({ error: 'USER_NOT_FOUND', message: 'User not found.' });
    }

    const session = authRepository.createSession(user.id);

    return reply.send({
      user,
      sessionToken: session.token
    });
  });

  // ── Logout ──

  app.post('/api/auth/logout', async (request, reply) => {
    const authHeader = request.headers.authorization;
    if (authHeader?.startsWith('Bearer ')) {
      authRepository.deleteSession(authHeader.slice(7));
    }
    return reply.send({ ok: true });
  });

  // ── Generate Invite (admin only) ──

  app.post('/api/household/invite', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'UNAUTHENTICATED', message: 'Not signed in.' });
    }

    if (request.user.role !== 'admin') {
      return reply.status(403).send({
        error: 'NOT_ADMIN',
        message: 'Only the household admin can invite members.'
      });
    }

    // M32 limit: two users max
    const memberCount = authRepository.getHouseholdMemberCount(request.user.householdId);
    if (memberCount >= 2) {
      return reply.status(409).send({
        error: 'HOUSEHOLD_FULL',
        message: 'Your household already has two members. Additional members are coming in a future update.'
      });
    }

    const body = generateInviteRequestSchema.parse(request.body ?? {});

    const invitation = authRepository.createInvitation({
      householdId: request.user.householdId,
      invitedByUserId: request.user.userId,
      email: body.email
    });

    return reply.send({
      code: invitation.code,
      expiresAt: invitation.expiresAt
    });
  });

  // ── Claim Invite ──

  app.post('/api/household/invite/claim', async (request, reply) => {
    const body = claimInviteRequestSchema.parse(request.body);

    // Look up the invitation
    const invitation = authRepository.findInvitationByCode(body.code);
    if (!invitation) {
      return reply.status(404).send({
        error: 'INVALID_INVITE',
        message: 'This invite code is invalid or has expired.'
      });
    }

    // M32: enforce two-user household cap
    const existingMembers = authRepository.findUsersByHousehold(invitation.householdId);
    if (existingMembers.length >= 2) {
      return reply.status(409).send({
        error: 'HOUSEHOLD_FULL',
        message: 'This household already has two members.'
      });
    }

    // Check if email is already registered
    const existingUser = authRepository.findUserByEmail(body.email);
    if (existingUser) {
      return reply.status(409).send({
        error: 'EMAIL_IN_USE',
        message: 'An account with this email already exists. Try signing in instead.'
      });
    }

    // Create the member user
    const user = authRepository.createUser({
      name: body.name,
      email: body.email,
      householdId: invitation.householdId,
      role: 'member'
    });

    // Claim the invitation
    authRepository.claimInvitation(body.code, user.id);

    // Create session immediately — user just joined, sign them in
    const session = authRepository.createSession(user.id);

    return reply.send({
      user,
      sessionToken: session.token,
      magicLinkSent: false,
      message: 'Welcome! You are now signed in.'
    });
  });

  // ── Household Members (authenticated) ──

  app.get('/api/household/members', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'UNAUTHENTICATED', message: 'Not signed in.' });
    }

    const members = authRepository.findUsersByHousehold(request.user.householdId);
    const pendingInvitations = request.user.role === 'admin'
      ? authRepository.findPendingInvitations(request.user.householdId)
      : [];

    return reply.send({ members, pendingInvitations });
  });

  // ── Revoke Invite (admin only) ──

  app.delete('/api/household/invite/:invitationId', async (request, reply) => {
    if (!request.user) {
      return reply.status(401).send({ error: 'UNAUTHENTICATED', message: 'Not signed in.' });
    }

    if (request.user.role !== 'admin') {
      return reply.status(403).send({ error: 'NOT_ADMIN', message: 'Only the admin can revoke invitations.' });
    }

    const { invitationId } = request.params as { invitationId: string };
    const revoked = authRepository.revokeInvitation(invitationId, request.user.householdId);

    if (!revoked) {
      return reply.status(404).send({ error: 'NOT_FOUND', message: 'Invitation not found or already claimed.' });
    }

    return reply.send({ ok: true });
  });
}
