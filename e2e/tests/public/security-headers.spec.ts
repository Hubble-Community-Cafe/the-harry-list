import { test } from '@playwright/test';
import { expectSecurityHeadersEverywhere, expectRuntimeConfigNotCached } from '../../fixtures/securityHeaders';

test('the page, static assets and health check all carry the security headers and CSP', async ({ request }) => {
  await expectSecurityHeadersEverywhere(request);
});

test('the runtime config is revalidated on every load, hashed bundles stay cached', async ({ request }) => {
  await expectRuntimeConfigNotCached(request);
});
