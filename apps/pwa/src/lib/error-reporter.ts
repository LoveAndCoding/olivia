/**
 * Lightweight frontend error reporter that POSTs to /api/errors.
 * Rate-limited to MAX_REPORTS_PER_WINDOW to avoid flooding the API.
 */

import { resolveApiUrl } from './api';

const MAX_REPORTS_PER_WINDOW = 5;
const WINDOW_MS = 60_000; // 1 minute
const MAX_RECENT_ERRORS = 3;

const timestamps: number[] = [];
const recentErrors: string[] = [];

/** Returns the last 3 client-side error messages (most recent first). */
export function getRecentErrors(): string[] {
  return [...recentErrors];
}

function isRateLimited(): boolean {
  const now = Date.now();
  while (timestamps.length > 0 && timestamps[0]! < now - WINDOW_MS) {
    timestamps.shift();
  }
  return timestamps.length >= MAX_REPORTS_PER_WINDOW;
}

export interface ErrorReportPayload {
  message: string;
  stack?: string;
  url?: string;
  context?: string;
}

/**
 * Report an error to POST /api/errors. Fire-and-forget — never throws.
 */
export function reportError(payload: ErrorReportPayload): void {
  // Always capture for feedback context, even if rate-limited for API reporting
  const summary = payload.message.slice(0, 200);
  recentErrors.unshift(summary);
  if (recentErrors.length > MAX_RECENT_ERRORS) recentErrors.length = MAX_RECENT_ERRORS;

  if (isRateLimited()) return;
  timestamps.push(Date.now());

  const prefix = payload.context ? `[${payload.context}] ` : '';
  const body = {
    message: `${prefix}${payload.message}`.slice(0, 2000),
    stack: payload.stack?.slice(0, 10000),
    source: 'fe' as const,
    url: payload.url ?? window.location.href,
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent.slice(0, 500),
  };

  try {
    fetch(resolveApiUrl('/api/errors'), {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    }).catch(() => {
      // Silently ignore — we can't report errors about error reporting
    });
  } catch {
    // Silently ignore synchronous errors (e.g. fetch not available)
  }
}

/**
 * Extract a useful message from an unknown error value.
 */
export function errorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return String(err);
}

/**
 * Extract a stack trace from an unknown error value.
 */
export function errorStack(err: unknown): string | undefined {
  if (err instanceof Error) return err.stack;
  return undefined;
}
