import { test, expect } from '@playwright/test';
import { resetBackend } from '../../fixtures/backend';

/**
 * Smoke test: proves the harness is wired up — the public app is served, talks to the
 * backend, and the seed/reset endpoint is reachable. Real flows are added in later specs.
 */
test.describe('harness smoke', () => {
  test('public reservation form loads', async ({ page, request }) => {
    await resetBackend(request);

    await page.goto('/');

    await expect(page.getByText('Contact Information')).toBeVisible();
    await expect(page.getByTestId('contact-name')).toBeVisible();
    await expect(page.getByTestId('contact-email')).toBeVisible();
  });
});
