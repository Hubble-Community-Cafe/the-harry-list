import { test } from '@playwright/test';
import { expectSecurityHeadersEverywhere } from '../../fixtures/securityHeaders';

test('the page, static assets and health check all carry the security headers and CSP', async ({ request }) => {
  await expectSecurityHeadersEverywhere(request);
});
