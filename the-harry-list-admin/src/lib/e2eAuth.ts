/**
 * End-to-end test authentication bridge.
 *
 * The admin app normally authenticates with Microsoft (MSAL) and sends a Bearer token.
 * That can't be driven in a headless test, so the e2e docker image injects an
 * {@code E2E_AUTH_OID} runtime value. When present, the app skips MSAL and instead sends
 * {@code X-Test-*} headers that the backend's e2e security chain understands.
 *
 * This is inert in dev and production: the runtime value is only ever set by
 * docker-compose.e2e.yml, so {@link isE2E} returns false everywhere else.
 */

function clean(value: string | undefined): string | undefined {
  if (!value || value.startsWith('__') || value.trim() === '') return undefined;
  return value;
}

export interface E2eAuth {
  oid: string;
  email?: string;
  name?: string;
}

/** Returns the injected e2e identity, or null when not running under the e2e stack. */
export function getE2eAuth(): E2eAuth | null {
  const cfg = window.__RUNTIME_CONFIG__;
  const oid = clean(cfg?.E2E_AUTH_OID);
  if (!oid) return null;
  return { oid, email: clean(cfg?.E2E_AUTH_EMAIL), name: clean(cfg?.E2E_AUTH_NAME) };
}

/** True only when the app is running under the e2e test stack. */
export function isE2E(): boolean {
  return getE2eAuth() !== null;
}
