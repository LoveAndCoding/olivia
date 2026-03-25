import fp from 'fastify-plugin';
import type { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import type { AuthUser } from '@olivia/contracts';
import type { AuthRepository } from './auth-repository';

// ─── Fastify Type Augmentation ──────────────────────────────────────

declare module 'fastify' {
  interface FastifyRequest {
    user?: AuthUser;
  }
}

// ─── Public Routes ──────────────────────────────────────────────────

const PUBLIC_ROUTES = new Set([
  '/api/health',
  '/api/auth/magic-link',
  '/api/auth/verify',
  '/api/auth/setup',
  '/api/auth/status',
  '/api/household/invite/claim',
  '/api/errors'
]);

const PUBLIC_PREFIXES = [
  '/api/auth/'
];

function isPublicRoute(url: string): boolean {
  const path = url.split('?')[0]!;
  if (PUBLIC_ROUTES.has(path)) return true;
  return PUBLIC_PREFIXES.some((prefix) => path.startsWith(prefix));
}

// ─── Token Extraction ───────────────────────────────────────────────

function extractSessionToken(request: FastifyRequest): string | null {
  // Check Authorization header first (Bearer token)
  const authHeader = request.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice(7);
  }

  // Check cookie fallback
  const cookieHeader = request.headers.cookie;
  if (cookieHeader) {
    const match = cookieHeader.match(/olivia_session=([^;]+)/);
    if (match) return match[1]!;
  }

  return null;
}

// ─── Auth Plugin ────────────────────────────────────────────────────

export type AuthMiddlewareOptions = {
  authRepository: AuthRepository;
  enabled: boolean;
};

async function authMiddlewareImpl(
  app: FastifyInstance,
  options: AuthMiddlewareOptions
): Promise<void> {
  const { authRepository, enabled } = options;

  if (!enabled) {
    // When auth is not enabled (e.g., during migration/setup), skip validation
    // but still try to attach user if token is present
    app.addHook('onRequest', async (request: FastifyRequest, _reply: FastifyReply) => {
      const token = extractSessionToken(request);
      if (token) {
        request.user = authRepository.validateSession(token) ?? undefined;
      }
    });
    return;
  }

  app.addHook('onRequest', async (request: FastifyRequest, reply: FastifyReply) => {
    if (isPublicRoute(request.url)) {
      // Still try to attach user for convenience (e.g., /api/auth/me needs it)
      const token = extractSessionToken(request);
      if (token) {
        request.user = authRepository.validateSession(token) ?? undefined;
      }
      return;
    }

    const token = extractSessionToken(request);
    if (!token) {
      return reply.status(401).send({
        error: 'UNAUTHENTICATED',
        message: 'Session token required. Please log in.'
      });
    }

    const user = authRepository.validateSession(token);
    if (!user) {
      return reply.status(401).send({
        error: 'SESSION_EXPIRED',
        message: 'Your session has expired. Please log in again.'
      });
    }

    request.user = user;
  });
}

// Use fastify-plugin to break encapsulation — hooks apply to ALL routes
export const authMiddleware = fp(authMiddlewareImpl);
