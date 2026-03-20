import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createErrorReporter, errorReportSchema } from '../src/error-reporter';
import type { PaperclipConfig } from '../src/config';

const makeLogger = () =>
  ({ info: vi.fn(), warn: vi.fn(), debug: vi.fn(), error: vi.fn() }) as unknown as Parameters<typeof createErrorReporter>[1];

const validError = {
  message: 'Something went wrong',
  stack: 'Error: Something went wrong\n  at foo.ts:1',
  source: 'fe' as const,
  url: 'http://localhost:4173/inbox',
  timestamp: '2026-03-20T12:00:00.000Z',
  userAgent: 'Mozilla/5.0',
};

describe('errorReportSchema', () => {
  it('accepts a valid error report', () => {
    const result = errorReportSchema.parse(validError);
    expect(result.message).toBe('Something went wrong');
    expect(result.source).toBe('fe');
  });

  it('accepts minimal payload (message + source only)', () => {
    const result = errorReportSchema.parse({ message: 'fail', source: 'be' });
    expect(result.message).toBe('fail');
    expect(result.source).toBe('be');
    expect(result.stack).toBeUndefined();
  });

  it('rejects empty message', () => {
    expect(() => errorReportSchema.parse({ message: '', source: 'fe' })).toThrow();
  });

  it('rejects invalid source', () => {
    expect(() => errorReportSchema.parse({ message: 'x', source: 'unknown' })).toThrow();
  });
});

describe('createErrorReporter', () => {
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ identifier: 'OLI-999' }),
    });
    vi.stubGlobal('fetch', fetchSpy);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  const configuredPaperclip: PaperclipConfig = {
    apiUrl: 'http://paperclip.test',
    apiKey: 'test-key',
    companyId: 'comp-123',
    sreAgentId: 'sre-456',
  };

  const unconfiguredPaperclip: PaperclipConfig = {
    apiUrl: null,
    apiKey: null,
    companyId: null,
    sreAgentId: null,
  };

  it('reports isConfigured=false when Paperclip config is missing', () => {
    const log = makeLogger();
    const reporter = createErrorReporter(unconfiguredPaperclip, log);
    expect(reporter.isConfigured).toBe(false);
  });

  it('reports isConfigured=true when Paperclip config is complete', () => {
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);
    expect(reporter.isConfigured).toBe(true);
  });

  it('skips issue creation when not configured', async () => {
    const log = makeLogger();
    const reporter = createErrorReporter(unconfiguredPaperclip, log);
    await reporter.report(validError);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(log.warn).toHaveBeenCalled();
  });

  it('creates a Paperclip issue when configured', async () => {
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);
    await reporter.report(validError);

    expect(fetchSpy).toHaveBeenCalledOnce();
    const [url, opts] = fetchSpy.mock.calls[0];
    expect(url).toBe('http://paperclip.test/api/companies/comp-123/issues');
    expect(opts.method).toBe('POST');
    expect(opts.headers['Authorization']).toBe('Bearer test-key');

    const body = JSON.parse(opts.body);
    expect(body.title).toBe('[Error] Something went wrong');
    expect(body.assigneeAgentId).toBe('sre-456');
    expect(body.priority).toBe('medium');
    expect(body.status).toBe('todo');
    expect(body.description).toContain('Frontend');
    expect(body.description).toContain('Something went wrong');
    expect(body.description).toContain('Stack Trace');
  });

  it('truncates long error messages in title', async () => {
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);
    const longMessage = 'A'.repeat(200);
    await reporter.report({ ...validError, message: longMessage });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.title.length).toBeLessThanOrEqual(108); // [Error] + space + 97 + ...
    expect(body.title).toContain('...');
  });

  it('rate-limits after 10 reports', async () => {
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);

    for (let i = 0; i < 10; i++) {
      await reporter.report({ ...validError, message: `error ${i}` });
    }
    expect(fetchSpy).toHaveBeenCalledTimes(10);

    // 11th should be rate-limited
    await reporter.report({ ...validError, message: 'error 10' });
    expect(fetchSpy).toHaveBeenCalledTimes(10);
    expect(log.warn).toHaveBeenCalledWith(
      expect.objectContaining({ error: 'error 10' }),
      expect.stringContaining('rate-limited')
    );
  });

  it('logs error when Paperclip API returns non-ok', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 500,
      text: () => Promise.resolve('Internal Server Error'),
    });
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);
    await reporter.report(validError);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ status: 500 }),
      expect.stringContaining('Failed to create')
    );
  });

  it('logs error when fetch throws', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('Network error'));
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);
    await reporter.report(validError);
    expect(log.error).toHaveBeenCalledWith(
      expect.objectContaining({ err: expect.any(Error) }),
      expect.stringContaining('Failed to reach')
    );
  });

  it('includes optional fields in description when present', async () => {
    const log = makeLogger();
    const reporter = createErrorReporter(configuredPaperclip, log);
    await reporter.report({
      ...validError,
      route: '/api/inbox/items',
      method: 'POST',
      statusCode: 500,
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body);
    expect(body.description).toContain('POST /api/inbox/items');
    expect(body.description).toContain('Status Code:** 500');
  });
});
