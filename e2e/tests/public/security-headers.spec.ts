import { test } from '@playwright/test';
import { expectSecurityHeadersEverywhere, expectCachePolicy } from '../../fixtures/securityHeaders';

test('the page, static assets and health check all carry the security headers and CSP', async ({ request }) => {
  await expectSecurityHeadersEverywhere(request);
});

test('the runtime config and public folder files are revalidated on every load, hashed bundles stay cached', async ({ request }) => {
  await expectCachePolicy(request);
});
