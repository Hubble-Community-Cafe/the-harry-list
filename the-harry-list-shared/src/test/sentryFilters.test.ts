import { describe, expect, it } from 'vitest';
import { SENTRY_EXTENSION_DENY_URLS, SENTRY_EXTENSION_ERRORS } from '../lib/sentryFilters';

const matchesAny = (patterns: RegExp[], value: string) => patterns.some((p) => p.test(value));

describe('Sentry extension filters', () => {
  it.each([
    'Invalid call to runtime.sendMessage(). Tab not found.',
    'Could not establish connection. Receiving end does not exist.',
    'Extension context invalidated.',
  ])('ignores the extension error "%s"', (message) => {
    expect(matchesAny(SENTRY_EXTENSION_ERRORS, message)).toBe(true);
  });

  it.each([
    "Cannot read properties of undefined (reading 'map')",
    'Failed to fetch',
    'ChunkLoadError: Loading chunk 3 failed',
  ])('keeps the app error "%s"', (message) => {
    expect(matchesAny(SENTRY_EXTENSION_ERRORS, message)).toBe(false);
  });

  it.each([
    'safari-web-extension://ABC/content.js',
    'chrome-extension://abc/inject.js',
    'moz-extension://abc/content.js',
  ])('denies scripts from %s', (url) => {
    expect(matchesAny(SENTRY_EXTENSION_DENY_URLS, url)).toBe(true);
  });

  it('allows our own bundle', () => {
    expect(matchesAny(SENTRY_EXTENSION_DENY_URLS, 'https://harry.hubble.cafe/assets/index-abc.js')).toBe(false);
  });
});
