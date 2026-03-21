import { describe, expect, it } from 'vitest';
import { resolveApiUrl } from './api';

describe('resolveApiUrl', () => {
  it('avoids duplicating the api prefix for relative bases', () => {
    expect(resolveApiUrl('/api/inbox/items/preview-create', '/api')).toBe('/api/inbox/items/preview-create');
  });

  it('preserves query parameters for relative bases', () => {
    expect(resolveApiUrl('/api/inbox/items?actorRole=stakeholder&view=all', '/api')).toBe(
      '/api/inbox/items?actorRole=stakeholder&view=all'
    );
  });

  it('joins paths onto absolute hosts without changing the endpoint path', () => {
    expect(resolveApiUrl('/api/inbox/items/preview-create', 'http://127.0.0.1:3001')).toBe(
      'http://127.0.0.1:3001/api/inbox/items/preview-create'
    );
  });

  it('avoids duplicating the api prefix for absolute bases with a path segment', () => {
    expect(resolveApiUrl('/api/inbox/items/preview-create', 'https://olivia.local/api')).toBe(
      'https://olivia.local/api/inbox/items/preview-create'
    );
  });

  it('resolves correctly with a Tailscale host base URL (native iOS build)', () => {
    expect(resolveApiUrl('/api/chat/messages', 'http://100.64.0.5/api')).toBe(
      'http://100.64.0.5/api/chat/messages'
    );
  });

  it('falls back to default when baseUrl is empty string', () => {
    const result = resolveApiUrl('/api/health', '');
    expect(result).toBe('/api/health');
  });
});
