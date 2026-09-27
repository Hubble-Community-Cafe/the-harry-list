import { test, expect } from '@playwright/test';
import { resetBackend, seedReservation, seedUser } from '../../fixtures/backend';
import { watchCspViolations, expectEnforcingCsp, expectNoCspViolations } from '../../fixtures/csp';

/**
 * The admin runs under an enforcing Content-Security-Policy (nginx-csp.conf). Visits every page so a
 * directive that blocks the API, an image or a style fails here instead of in production. MSAL and
 * Graph are not exercised: the e2e stack signs in through the test header bridge.
 */
test('every admin page loads under the Content-Security-Policy', async ({ page, request }, testInfo) => {
  await resetBackend(request);
  // ADMIN, so the admin-only pages render their real content instead of a permission error.
  await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
  const seeded = await seedReservation(request, {
    contactName: 'CSP Guest',
    email: 'csp.guest@example.com',
    eventTitle: 'CSP Probe Booking',
    description: 'Detail page under the CSP',
    eventDate: '2030-10-09',
    startTime: '15:00',
    endTime: '17:00',
    expectedGuests: 8,
    location: 'HUBBLE',
    seatingArea: 'INSIDE',
    paymentOption: 'INDIVIDUAL',
    status: 'PENDING',
  });
  const violations = await watchCspViolations(page);

  const response = await page.goto('/');
  expectEnforcingCsp(response, "script-src 'self'", 'https://login.microsoftonline.com', 'https://graph.microsoft.com', 'http://localhost:8080');

  const routes = ['/reservations', `/reservations/${seeded.id}`, '/week-overview', '/export', '/calendar',
    '/email-templates', '/settings', '/calendar-appointments', '/audit'];
  for (const route of routes) {
    await page.goto(route);
    await expect(page.locator('main h1').first()).toBeVisible();
    // Give the page's data requests, images and styles time to load, so a blocked one is reported.
    // (Waiting for network idle does not work: some pages keep polling.)
    await page.waitForTimeout(750);
  }

  await expectNoCspViolations(violations, testInfo);
});
