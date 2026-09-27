import { test, expect } from '@playwright/test';
import { ReservationFormPage } from '../../pages/ReservationFormPage';
import { resetBackend } from '../../fixtures/backend';
import { watchCspViolations, expectEnforcingCsp, expectNoCspViolations } from '../../fixtures/csp';

/**
 * The public form runs under an enforcing Content-Security-Policy (nginx-csp.conf). Walks the whole
 * form, lets the ALTCHA widget solve its proof-of-work in a Web Worker and submits, so a directive
 * that blocks the API, the worker or the widget's styles fails here instead of in production.
 */
test('the reservation form works under the Content-Security-Policy', async ({ page, request }, testInfo) => {
  await resetBackend(request);
  const violations = await watchCspViolations(page);
  const form = new ReservationFormPage(page);

  const response = await page.goto('/');
  expectEnforcingCsp(response, "script-src 'self'", "frame-ancestors 'none'", 'worker-src', 'http://localhost:8080');

  await form.fillContact({ name: 'Casey Policy', email: 'casey.csp@example.com' });
  await form.continue();
  await form.expectStep('Event Details');
  await form.fillActivity({ title: 'CSP Probe Drinks', date: '2030-10-08', startTime: '15:00', endTime: '17:00', guests: 12 });
  await form.expectStep('Where would you like to host your event?');
  await form.selectLocation('NO_PREFERENCE');
  await form.selectSeating('INSIDE');
  await form.continue();
  await form.expectStep('Payment Information');
  await form.selectPayment('People pay individually');
  await form.continue();

  // The widget only reaches "verified" if its worker was allowed to run.
  await expect(page.locator('altcha-widget [data-state="verified"]')).toBeVisible({ timeout: 20_000 });
  await form.acceptTerms();
  await form.submit();
  await expect(page.getByText('Reservation Submitted!')).toBeVisible();

  await expectNoCspViolations(violations, testInfo);
});
