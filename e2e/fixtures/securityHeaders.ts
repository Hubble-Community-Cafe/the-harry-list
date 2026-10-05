import { expect, type APIRequestContext } from '@playwright/test';

/** Set at server level in the shared nginx.conf (nginx-security-headers.conf). */
const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

/** A hashed bundle from index.html, served by the long-cache static-assets location. */
async function hashedScriptPath(request: APIRequestContext): Promise<string> {
  const page = await request.get('/');
  expect(page.ok()).toBe(true);
  const script = (await page.text()).match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
  expect(script, 'script asset in index.html').toBeTruthy();
  return script!;
}

/**
 * Every kind of response nginx serves carries the security headers and the CSP. nginx drops the
 * inherited add_header lines in any location that declares its own, so the static-assets,
 * /config.js and /health locations are checked separately from the page itself.
 */
export async function expectSecurityHeadersEverywhere(request: APIRequestContext): Promise<void> {
  const page = await request.get('/');
  const script = await hashedScriptPath(request);

  const health = await request.get('/health');
  expect(await health.text()).toBe('OK');
  expect(health.headers()['content-type']).toContain('text/plain');

  for (const [path, response] of [['/', page], [script, await request.get(script)],
    ['/config.js', await request.get('/config.js')], ['/health', health]] as const) {
    expect(response.ok(), path).toBe(true);
    const headers = response.headers();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(headers[name], `${name} on ${path}`).toBe(value);
    }
    expect(headers['content-security-policy'], `Content-Security-Policy on ${path}`).toContain("default-src 'self'");
  }
}

/** Unhashed files both apps serve: the runtime config and public/ folder files. */
const UNHASHED_FILES = ['/config.js', '/favicon.svg', '/fonts/AXIS.woff2'];

/**
 * Unhashed files (the runtime config written at container startup, and the public/ folder files)
 * are revalidated on every load, so a changed setting or replaced file shows up right away. Hashed
 * bundles keep their year-long cache, with a single Cache-Control header.
 */
export async function expectCachePolicy(request: APIRequestContext): Promise<void> {
  for (const path of UNHASHED_FILES) {
    const response = await request.get(path);
    expect(response.ok(), path).toBe(true);
    expect(response.headers()['cache-control'], `Cache-Control on ${path}`).toBe('no-cache');
    expect(response.headers()['expires'], `Expires on ${path}`).toBeUndefined();
  }
  const config = await request.get('/config.js');
  expect(await config.text()).toContain('window.__RUNTIME_CONFIG__');

  // headersArray, because headers() joins repeated headers into one value.
  const script = await request.get(await hashedScriptPath(request));
  const cacheControl = script.headersArray().filter((h) => h.name.toLowerCase() === 'cache-control');
  expect(cacheControl.map((h) => h.value), 'Cache-Control on a hashed bundle').toEqual([
    'public, max-age=31536000, immutable',
  ]);

  // A missing bundle must not be cached, or a 404 hit mid-deploy would stick for a year.
  const missing = await request.get('/assets/does-not-exist.js');
  expect(missing.status()).toBe(404);
  expect(missing.headers()['cache-control'], 'Cache-Control on a missing bundle').toBeUndefined();
}
