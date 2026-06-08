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

  test('filters by catering and concatenates with location', async ({ request }, testInfo) => {
    // The beforeEach seeded a non-catering Hubble event ("Calendar Feed Event").
    // Add a Hubble catering event and a Meteor catering event.
    await seedReservation(request, {
      contactName: 'Catering Guest',
      email: 'catering@example.com',
      eventTitle: 'Hubble Catering Event',
      description: 'Has catering',
      eventDate: '2030-10-21',
      startTime: '12:00',
      endTime: '14:00',
      expectedGuests: 30,
      location: 'HUBBLE',
      seatingArea: 'INSIDE',
      paymentOption: 'INVOICE',
      status: 'CONFIRMED',
      specialActivities: ['EAT_CATERING'],
    });
    await seedReservation(request, {
      contactName: 'Meteor Guest',
      email: 'meteor@example.com',
      eventTitle: 'Meteor Catering Event',
      description: 'Meteor catering',
      eventDate: '2030-10-22',
      startTime: '12:00',
      endTime: '14:00',
      expectedGuests: 15,
      location: 'METEOR',
      seatingArea: 'INSIDE',
      paymentOption: 'INVOICE',
      status: 'CONFIRMED',
      specialActivities: ['EAT_CATERING'],
    });

    // catering=true → only catering events, the non-catering one is gone.
    const cateringOnly = await request.get(`${BACKEND_URL}/api/calendar/feed.ics?token=${FEED_TOKEN}&catering=true`);
    expect(cateringOnly.status()).toBe(200);
    const cateringIcs = await cateringOnly.text();
    await attachText(testInfo, 'catering-true.ics', cateringIcs);
    expect(cateringIcs).toContain('Hubble Catering Event');
    expect(cateringIcs).toContain('Meteor Catering Event');
    expect(cateringIcs).not.toContain('Calendar Feed Event');

    // catering=false → only non-catering events.
    const nonCatering = await request.get(`${BACKEND_URL}/api/calendar/feed.ics?token=${FEED_TOKEN}&catering=false`);
    expect(nonCatering.status()).toBe(200);
    const nonCateringIcs = await nonCatering.text();
    await attachText(testInfo, 'catering-false.ics', nonCateringIcs);
    expect(nonCateringIcs).toContain('Calendar Feed Event');
    expect(nonCateringIcs).not.toContain('Hubble Catering Event');

    // location=HUBBLE&catering=true → concatenated: only the Hubble catering event.
    const combined = await request.get(`${BACKEND_URL}/api/calendar/feed.ics?token=${FEED_TOKEN}&location=HUBBLE&catering=true`);
    expect(combined.status()).toBe(200);
    const combinedIcs = await combined.text();
    await attachText(testInfo, 'hubble-catering.ics', combinedIcs);
    expect(combinedIcs).toContain('Hubble Catering Event');
    expect(combinedIcs).not.toContain('Meteor Catering Event');
    expect(combinedIcs).not.toContain('Calendar Feed Event');
  });
});
