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

/**
 * The runtime config (/config.js, written at container startup) is revalidated on every load, so a
 * changed setting reaches browsers after a restart. Hashed bundles keep their year-long cache.
 */
export async function expectRuntimeConfigNotCached(request: APIRequestContext): Promise<void> {
  const config = await request.get('/config.js');
  expect(config.ok()).toBe(true);
  expect(await config.text()).toContain('window.__RUNTIME_CONFIG__');
  expect(config.headers()['cache-control']).toBe('no-cache');
  expect(config.headers()['expires'], 'Expires on /config.js').toBeUndefined();

  // headersArray, because headers() joins repeated headers into one value.
  const script = await request.get(await hashedScriptPath(request));
  const cacheControl = script.headersArray().filter((h) => h.name.toLowerCase() === 'cache-control');
  expect(cacheControl.map((h) => h.value), 'Cache-Control on a hashed bundle').toEqual([
    'public, max-age=31536000, immutable',
  ]);
}
