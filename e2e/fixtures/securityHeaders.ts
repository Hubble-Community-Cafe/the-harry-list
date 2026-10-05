import { expect, type APIRequestContext } from '@playwright/test';

/** Set at server level in the shared nginx.conf (nginx-security-headers.conf). */
const SECURITY_HEADERS: Record<string, string> = {
  'x-content-type-options': 'nosniff',
  'x-frame-options': 'DENY',
  'referrer-policy': 'strict-origin-when-cross-origin',
  'permissions-policy': 'camera=(), microphone=(), geolocation=()',
};

/**
 * Every kind of response nginx serves carries the security headers and the CSP. nginx drops the
 * inherited add_header lines in any location that declares its own, so the static-assets and
 * /health locations are checked separately from the page itself.
 */
export async function expectSecurityHeadersEverywhere(request: APIRequestContext): Promise<void> {
  const page = await request.get('/');
  expect(page.ok()).toBe(true);
  // A hashed bundle from index.html, served by the long-cache static-assets location.
  const script = (await page.text()).match(/<script[^>]+src="(\/assets\/[^"]+\.js)"/)?.[1];
  expect(script, 'script asset in index.html').toBeTruthy();

  const health = await request.get('/health');
  expect(await health.text()).toBe('OK');
  expect(health.headers()['content-type']).toContain('text/plain');

  for (const [path, response] of [['/', page], [script!, await request.get(script!)], ['/health', health]] as const) {
    expect(response.ok(), path).toBe(true);
    const headers = response.headers();
    for (const [name, value] of Object.entries(SECURITY_HEADERS)) {
      expect(headers[name], `${name} on ${path}`).toBe(value);
    }
    expect(headers['content-security-policy'], `Content-Security-Policy on ${path}`).toContain("default-src 'self'");
  }
}
