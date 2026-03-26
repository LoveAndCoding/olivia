import { describe, expect, it, vi, beforeAll } from 'vitest';

// Stub browser globals before importing the module
vi.stubGlobal('window', { location: { href: 'http://localhost/' } });
vi.stubGlobal('navigator', { userAgent: 'test-agent' });
vi.stubGlobal('fetch', vi.fn(() => Promise.resolve()));

// Dynamic import after globals are set up
const { reportError, getRecentErrors } = await import('./error-reporter');

describe('getRecentErrors', () => {
  it('captures reported errors in most-recent-first order', () => {
    reportError({ message: 'first error' });
    reportError({ message: 'second error' });
    const errors = getRecentErrors();
    expect(errors[0]).toBe('second error');
    expect(errors[1]).toBe('first error');
  });

  it('caps at 3 most recent errors', () => {
    // Fill beyond 3
    for (let i = 0; i < 10; i++) {
      reportError({ message: `err-${i}` });
    }
    const errors = getRecentErrors();
    expect(errors.length).toBe(3);
    expect(errors[0]).toBe('err-9');
    expect(errors[1]).toBe('err-8');
    expect(errors[2]).toBe('err-7');
  });

  it('returns a copy, not the internal array', () => {
    const a = getRecentErrors();
    const b = getRecentErrors();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });

  it('truncates long messages to 200 characters', () => {
    const longMsg = 'x'.repeat(300);
    reportError({ message: longMsg });
    const errors = getRecentErrors();
    expect(errors[0]!.length).toBe(200);
  });
});
