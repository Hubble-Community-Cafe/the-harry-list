import * as Sentry from '@sentry/react';
import { configuredValue } from './runtimeConfig';
import { SENTRY_EXTENSION_DENY_URLS, SENTRY_EXTENSION_ERRORS } from './sentryFilters';

export interface SentrySetup {
  /** Runtime DSN (config.js) or build-time fallback; Sentry stays off when it is missing. */
  dsn: string | null | undefined;
  /** App name for the release, e.g. `the-harry-list-admin`. */
  app: string;
  version: string;
  /** Usually `import.meta.env.MODE`. */
  environment: string;
}

/**
 * Starts Sentry with the settings both apps use. Returns whether Sentry is on.
 * Transient network blips (offline, flaky mobile, navigation aborts) and errors thrown by
 * browser extensions are not bugs in our code, so they are dropped.
 */
export function initSentry({ dsn, app, version, environment }: SentrySetup): boolean {
  const configured = configuredValue(dsn);
  if (!configured) return false;
  Sentry.init({
    dsn: configured,
    environment,
    release: `${app}@${version}`,
    integrations: [Sentry.browserTracingIntegration()],
    tracesSampleRate: 0.1,
    ignoreErrors: [
      'Failed to fetch',
      'NetworkError when attempting to fetch resource',
      'Load failed',
      ...SENTRY_EXTENSION_ERRORS,
    ],
    denyUrls: SENTRY_EXTENSION_DENY_URLS,
  });
  return true;
}
