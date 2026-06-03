import { test, expect } from '@playwright/test';
import { resetBackend, seedUser, seedReservation } from '../../fixtures/backend';
import { captureScreenshot } from '../../fixtures/evidence';

/**
 * Week overview: a reservation shows up in the correct week. We pin the displayed week via
 * the ?week= URL param so the test isn't coupled to "today".
 */
test.describe('admin: week overview shows reservations', () => {
  const EVENT_DATE = '2030-10-16'; // a fixed date; ?week= will resolve its Monday

  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedUser(request, { oid: 'e2e-admin', role: 'ADMIN' });
    await seedReservation(request, {
      contactName: 'Week Guest',
      email: 'week@example.com',
      eventTitle: 'Week Overview Event',
      description: 'Shows in the week grid',
      eventDate: EVENT_DATE,
      startTime: '14:00',
      endTime: '16:00',
      expectedGuests: 15,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'CONFIRMED',
    });
  });

  test('a reservation appears in its week', async ({ page }, testInfo) => {
    await page.goto(`/week-overview?week=${EVENT_DATE}`);
    await expect(page.getByText('Week Overview')).toBeVisible();

    const card = page.getByTestId('week-reservation').filter({ hasText: 'Week Overview Event' });
    await expect(card).toHaveCount(1);
    await expect(card).toContainText('CONFIRMED');
    await captureScreenshot(testInfo, page, '1-week-overview-event');
  });
});
