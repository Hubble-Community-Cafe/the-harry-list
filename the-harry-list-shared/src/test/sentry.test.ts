import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as Sentry from '@sentry/react';
import { initSentry } from '../lib/sentry';
import { SENTRY_EXTENSION_DENY_URLS } from '../lib/sentryFilters';

vi.mock('@sentry/react', () => ({
  init: vi.fn(),
  browserTracingIntegration: vi.fn(() => ({ name: 'BrowserTracing' })),
}));

describe('initSentry', () => {
  beforeEach(() => vi.clearAllMocks());

  it('stays off without a DSN or with an unreplaced placeholder', () => {
    expect(initSentry({ dsn: undefined, app: 'app', version: '1.0.0', environment: 'production' })).toBe(false);
    expect(initSentry({ dsn: '__SENTRY_DSN__', app: 'app', version: '1.0.0', environment: 'production' })).toBe(false);
    expect(Sentry.init).not.toHaveBeenCalled();
  });

  it('starts with the release, environment and shared noise filters', () => {
    const on = initSentry({
      dsn: 'https://key@sentry.example.com/1', app: 'the-harry-list-admin', version: '1.2.3', environment: 'production',
    });

    expect(on).toBe(true);
    const options = vi.mocked(Sentry.init).mock.calls[0][0]!;
    expect(options.dsn).toBe('https://key@sentry.example.com/1');
    expect(options.release).toBe('the-harry-list-admin@1.2.3');
    expect(options.environment).toBe('production');
    expect(options.ignoreErrors).toContain('Failed to fetch');
    expect(options.denyUrls).toEqual(SENTRY_EXTENSION_DENY_URLS);
  });
});
