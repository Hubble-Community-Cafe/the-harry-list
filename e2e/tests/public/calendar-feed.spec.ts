import { test, expect } from '@playwright/test';
import { resetBackend, seedReservation } from '../../fixtures/backend';
import { attachText } from '../../fixtures/evidence';
import { BACKEND_URL } from '../../playwright.config';

/**
 * Calendar feed (iCal): the token-protected feed serves reservations as an .ics calendar.
 * The token is configured in docker-compose.e2e.yml (CALENDAR_FEED_TOKEN).
 */
const FEED_TOKEN = 'e2e-feed-token';

test.describe('calendar feed (iCal)', () => {
  test.beforeEach(async ({ request }) => {
    await resetBackend(request);
    await seedReservation(request, {
      contactName: 'Feed Guest',
      email: 'feed@example.com',
      eventTitle: 'Calendar Feed Event',
      description: 'In the feed',
      eventDate: '2030-10-20',
      startTime: '15:00',
      endTime: '17:00',
      expectedGuests: 10,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INDIVIDUAL',
      status: 'CONFIRMED',
    });
  });

  test('rejects a missing token and serves events with a valid one', async ({ request }, testInfo) => {
    // Missing token is rejected.
    const noToken = await request.get(`${BACKEND_URL}/api/calendar/feed.ics`);
    expect(noToken.status()).toBe(401);

    // Valid token returns a calendar containing the reservation.
    const ok = await request.get(`${BACKEND_URL}/api/calendar/feed.ics?token=${FEED_TOKEN}`);
    expect(ok.status()).toBe(200);
    expect(ok.headers()['content-type']).toContain('text/calendar');

    const ics = await ok.text();
    await attachText(testInfo, 'feed.ics', ics);
    expect(ics).toContain('BEGIN:VCALENDAR');
    expect(ics).toContain('BEGIN:VEVENT');
    expect(ics).toContain('Calendar Feed Event');
  });
});
